/* =====================================================================================
 * 使用示意:
 * =====================================================================================

// 1. 注册鼠标
registerDriver({
  vendorId: 0x2FE5,
  productId: 0x0005,
  driver: createSimpleDriver({
    computeChecksum: scyroxChecksum, // 可覆盖 checksum 生成方法（不同厂商）
    // buildPktIndexSequence: (total) => total <= 1 ? [0] : [ ...自定义... ], // 可覆盖 pktIndex 生成序列（不同厂商）
  })
})

// 2. 创建设备连接
const suite = createHidSuite({ vendorId: 0x2FE5, productId: 0x0005, packetSize: 63 })
await suite.connect()

// 3. 发送数据
await suite.send({
  type: 1, // 发送的协议类型
  payload: new Uint8Array([]), // 需要发送的数据，该数据可以无限大，里面自动做好了分包逻辑。【去除第一个 reportId, 第二个 type 协议类型，第三个 index 第几个数据包，最后一个 Checksum 校验和,的纯中间数据】
  onProgress: (p) => console.log(p.phase, `${p.index}/${p.total}`),
})

 * ===================================================================================== */

export type Logger = {
  debug(...args: any[]): void
  info(...args: any[]): void
  warn(...args: any[]): void
  error(...args: any[]): void
}

export type HidSuiteOptions = {
  vendorId: number
  productId: number
  packetSize?: number
  timeoutMs?: number
  logger?: Logger
  deviceHint?: string
}

export type HidRawFrame = {
  reportId: number
  data: Uint8Array // length === packetSize
}

export type HidParsedIncoming =
  | { kind: "event", type: number, payload: any, raw: HidRawFrame }
  | {
      kind: "response"
      type: number
      ok: boolean
      pktIndex: number
      status?: number
      payload?: any
      raw: HidRawFrame
    }

export type OutgoingChunkMeta = {
  type: number
  pktIndex: number
}

/**
 * 分包计划：HidSuite 只会“按顺序执行这些帧，并等待匹配响应”
 */
export type ChunkPlan = {
  frames: Array<{
    frame: HidRawFrame
    meta: OutgoingChunkMeta
    phase: "single" | "data" | "eot"
  }>
  totalLogicalChunks: number // 逻辑 chunk 数（切片后的数量）
}

/* =====================================================================================
 * Section 2) AsyncQueue
 * ===================================================================================== */

class AsyncQueue<T> {
  private items: T[] = []
  private resolvers: Array<(value: T) => void> = []

  push(item: T) {
    const r = this.resolvers.shift()
    if (r) r(item)
    else this.items.push(item)
  }

  async shift(): Promise<T> {
    const item = this.items.shift()
    if (item !== undefined) return item
    return new Promise<T>((resolve) => this.resolvers.push(resolve))
  }

  clear() {
    this.items.length = 0
    this.resolvers.length = 0
  }
}

/* =====================================================================================
 * Section 3) Utils - device/collections
 * ===================================================================================== */

function hasNonEmptyReports(device: HIDDevice): boolean {
  for (const c of device.collections ?? []) {
    const inLen = c.inputReports?.length ?? 0
    const outLen = c.outputReports?.length ?? 0
    if (inLen > 0 && outLen > 0) return true
  }
  return false
}

function pickFirstCollectionWithInOut(device: HIDDevice): HIDCollectionInfo | null {
  for (const c of device.collections ?? []) {
    const inLen = c.inputReports?.length ?? 0
    const outLen = c.outputReports?.length ?? 0
    if (inLen > 0 && outLen > 0) return c
  }
  return null
}

function listOutputReportIds(device: HIDDevice): number[] {
  const ids: number[] = []
  for (const c of device.collections ?? []) {
    for (const r of c.outputReports ?? []) {
      if (typeof r.reportId === "number") ids.push(r.reportId)
    }
  }
  return Array.from(new Set(ids))
}

/* =====================================================================================
 * Section 4) Driver Interface（加入 buildChunkPlan：厂商自定义 pktIndex/顺序）
 * ===================================================================================== */

export type HidDriver = {
  name: string

  pickDevice(devices: HIDDevice[], hint?: string): HIDDevice
  pickOutputReportId(device: HIDDevice): number

  tryParseInputReport(args: {
    device: HIDDevice
    reportId: number
    data: DataView
    packetSize: number
  }): HidParsedIncoming | null

  matchResponse(incoming: HidParsedIncoming, meta: OutgoingChunkMeta): boolean

  /**
   * 由 driver 生成“完整发送计划”
   * - 内部决定：payload 如何切片、每个包的 pktIndex 怎么编码、包的发送顺序是什么、是否需要 EOT
   */
  buildChunkPlan(args: {
    device: HIDDevice
    reportId: number
    packetSize: number
    type: number
    payload: Uint8Array
  }): ChunkPlan
}

/* =====================================================================================
 * Section 5) HidSuite (Transport) - 只执行 driver 的 plan
 * ===================================================================================== */

type InternalState = "idle" | "connecting" | "connected" | "disconnected"

const defaultLogger: Logger = {
  debug: console.warn.bind(console),
  info: console.warn.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
}

/** new HidSuite(HidSuiteOptions 设备信息, HidDriver 设备协议驱动) */
export class HidSuite {
  private options: Required<Pick<HidSuiteOptions, "packetSize" | "timeoutMs">> &
    Omit<HidSuiteOptions, "packetSize" | "timeoutMs" | "logger"> & { logger: Logger }

  private driver: HidDriver
  private device: HIDDevice | null = null
  private state: InternalState = "idle"

  private incomingQueue = new AsyncQueue<HidParsedIncoming>()
  private eventListeners = new Set<(evt: Extract<HidParsedIncoming, { kind: "event" }>) => void>()

  // 串行 request
  private sendChain: Promise<void> = Promise.resolve()

  constructor(options: HidSuiteOptions, driver: HidDriver) {
    this.options = {
      ...options,
      packetSize: options.packetSize ?? 64,
      timeoutMs: options.timeoutMs ?? 1500,
      logger: options.logger ?? defaultLogger,
    }
    this.driver = driver
  }

  getState(): InternalState {
    return this.state
  }

  getDevice(): HIDDevice | null {
    return this.device
  }

  onEvent(cb: (evt: Extract<HidParsedIncoming, { kind: "event" }>) => void): () => void {
    this.eventListeners.add(cb)
    return () => this.eventListeners.delete(cb)
  }

  private emitEvent(evt: Extract<HidParsedIncoming, { kind: "event" }>) {
    for (const cb of this.eventListeners) cb(evt)
  }

  async connect(): Promise<void> {
    if (this.state === "connected" && this.device?.opened) return
    if (!("hid" in navigator)) throw new Error("WebHID not supported in this browser")

    this.state = "connecting"
    const { vendorId, productId, logger, deviceHint } = this.options

    const devices = await navigator.hid.requestDevice({ filters: [{ vendorId, productId }] })
    if (!devices.length) {
      this.state = "idle"
      throw new Error(`No device selected for vendorId=${vendorId}, productId=${productId}`)
    }

    const picked = this.driver.pickDevice(devices, deviceHint)
    await picked.open()

    picked.addEventListener("inputreport", this.onInputReport as any)
    navigator.hid.addEventListener("disconnect", this.onDisconnect as any)

    this.device = picked
    this.incomingQueue.clear()
    this.state = "connected"

    logger.info(`[HidSuite] connected: ${picked.productName}`)
    logger.debug(`[HidSuite] picked device hasInOut:`, hasNonEmptyReports(picked))
    logger.debug(`[HidSuite] output reportIds:`, listOutputReportIds(picked))
    logger.debug(`[HidSuite] chosen reportId:`, this.driver.pickOutputReportId(picked))
  }

  async disconnect(): Promise<void> {
    const d = this.device
    if (!d) return
    d.removeEventListener("inputreport", this.onInputReport as any)
    navigator.hid.removeEventListener("disconnect", this.onDisconnect as any)
    if (d.opened) await d.close()
    this.device = null
    this.state = "disconnected"
  }

  private onDisconnect = (ev: Event) => {
    const anyEv = ev as any
    const disconnected: HIDDevice | undefined = anyEv.device
    if (disconnected && this.device && disconnected === this.device) {
      this.options.logger.warn("[HidSuite] device disconnected")
      this.state = "disconnected"
      this.device = null
    }
  }

  private onInputReport = (ev: HIDInputReportEvent) => {
    const data = new Uint8Array(ev.data.buffer)
    this.options.logger.info('回复的数据================', data)

    if (!this.device) return
    const parsed = this.driver.tryParseInputReport({
      device: this.device,
      reportId: ev.reportId,
      data: ev.data,
      packetSize: this.options.packetSize,
    })
    if (!parsed) return
    this.options.logger.debug("[HidSuite] IN", parsed)
    this.incomingQueue.push(parsed)
    if (parsed.kind === "event") this.emitEvent(parsed)
  }

  async sendRaw(frame: HidRawFrame): Promise<void> {
    const device = this.device
    if (!device || !device.opened) throw new Error("Device not connected")
    if (frame.data.length !== this.options.packetSize) {
      throw new Error(`sendRaw expects packetSize=${this.options.packetSize}, got=${frame.data.length}`)
    }
    this.options.logger.debug("[HidSuite] OUT", frame)
    await device.sendReport(frame.reportId, frame.data as BufferSource)
  }

  async request(args: {
    frame: HidRawFrame
    meta: OutgoingChunkMeta
    timeoutMs?: number
  }): Promise<Extract<HidParsedIncoming, { kind: "response" }>> {
    const timeoutMs = args.timeoutMs ?? this.options.timeoutMs

    let resolve!: (v: Extract<HidParsedIncoming, { kind: "response" }>) => void
    let reject!: (e: any) => void
    const p = new Promise<Extract<HidParsedIncoming, { kind: "response" }>>((res, rej) => {
      resolve = res
      reject = rej
    })

    this.sendChain = this.sendChain.then(async () => {
      const timer = setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
      try {
        await this.sendRaw(args.frame)
        while (true) {
          const incoming = await this.incomingQueue.shift()
          if (incoming.kind !== "response") continue
          if (this.driver.matchResponse(incoming, args.meta)) {
            clearTimeout(timer)
            resolve(incoming)
            return
          }
        }
      } catch (e) {
        clearTimeout(timer)
        reject(e)
      }
    })

    return p
  }

  /**
   * 发送（可能分包也可能不分包）：
   * - 具体如何分包、pktIndex 如何编码、发送顺序如何，由 driver.buildChunkPlan 决定
   */
  async send(args: {
    type: number
    payload: Uint8Array
    timeoutMs?: number
    abortOnNack?: boolean
    onProgress?: (p: { index: number, total: number, phase: ChunkPlan["frames"][number]["phase"], lastResponse: any }) => void
  }): Promise<void> {
    const device = this.device
    if (!device || !device.opened) throw new Error("Device not connected")

    const reportId = this.driver.pickOutputReportId(device)
    const timeoutMs = args.timeoutMs ?? this.options.timeoutMs
    const abortOnNack = args.abortOnNack ?? true

    const plan = this.driver.buildChunkPlan({
      device,
      reportId,
      packetSize: this.options.packetSize,
      type: args.type,
      payload: args.payload,
    })

    for (let i = 0; i < plan.frames.length; i++) {
      const step = plan.frames[i]
      const resp = await this.request({ frame: step.frame, meta: step.meta, timeoutMs })
      args.onProgress?.({ index: i + 1, total: plan.frames.length, phase: step.phase, lastResponse: resp })
      if (abortOnNack && resp.ok === false) {
        throw new Error(`Device NACK: type=${step.meta.type}, pktIndex=${step.meta.pktIndex}, status=${resp.status ?? -1}`)
      }
    }
  }
}

/* =====================================================================================
 * Section 6) 可复用的 chunk planner：把“你描述的默认 pktIndex 策略”封装成配置
 * ===================================================================================== */

export type ChunkPlannerOptions = {
  /**
   * 切片：每个包可承载的最大 payload 长度（由协议头/校验决定）
   */
  getMaxChunkPayloadBytes: (packetSize: number) => number

  /**
   * 把一个 chunk 编码为 64B 包（含 checksum），并返回 meta（用于匹配响应）
   */
  buildPacket: (args: {
    reportId: number
    packetSize: number
    type: number
    pktIndex: number
    totalChunks: number
    chunkPayload: Uint8Array
  }) => Uint8Array

  /**
   * 生成 pktIndex 序列（决定发送顺序）：
   * - 你们默认：
   *   - totalChunks=1 => [0]（不分包只发 0）
   *   - totalChunks=3 => [2,1,0]
   * 更通用：让厂商自定义
   */
  buildPktIndexSequence: (totalChunks: number) => number[]

  /**
   * 将 payload 切成 chunks（可选覆盖默认切片）
   */
  slicePayloadIntoChunks?: (payload: Uint8Array, maxChunkPayloadBytes: number) => Uint8Array[]
}

export function createChunkPlanner(opts: ChunkPlannerOptions) {
  return (args: {
    reportId: number
    packetSize: number
    type: number
    payload: Uint8Array
  }): ChunkPlan => {
    const maxChunk = opts.getMaxChunkPayloadBytes(args.packetSize)
    const chunks = (opts.slicePayloadIntoChunks ?? defaultSlicePayload)(args.payload, maxChunk)

    if (chunks.length > 0xff) throw new Error(`Too many chunks: ${chunks.length} > 0xFF`)
    const totalChunks = chunks.length === 0 ? 1 : chunks.length // 允许空 payload 也至少走一次（通常 pktIndex=0）

    const seq = opts.buildPktIndexSequence(totalChunks)

    const frames: ChunkPlan["frames"] = []
    for (const pktIndex of seq) {
      let phase: "single" | "data" | "eot" = "data"

      // 根据你的规则：pktIndex=0 多用于 “无后续 / 结束 / 单包”
      if (totalChunks === 1 && pktIndex === 0) phase = "single"
      else if (pktIndex === 0) phase = "eot"

      // 将 pktIndex 映射到 chunkPayload：
      // - 约定：pktIndex=0 => 空 payload（结束包/单包）
      // - 其它 pktIndex => 需要从 chunks 里取对应数据块
      //   这里给出默认映射：pktIndex=k => chunks[k-1]（当 pktIndex 从 1..N）
      //   但你们默认策略是 2..1..0，所以 pktIndex=2 对应 chunks[1]，pktIndex=1 对应 chunks[0]
      //   这恰好符合 chunks[k-1] 映射。
      const chunkPayload = pktIndex === 0 ? new Uint8Array(0) : chunks[pktIndex - 1] ?? new Uint8Array(0)

      const data = opts.buildPacket({
        reportId: args.reportId,
        packetSize: args.packetSize,
        type: args.type,
        pktIndex,
        totalChunks,
        chunkPayload,
      })

      frames.push({
        frame: { reportId: args.reportId, data },
        meta: { type: args.type, pktIndex },
        phase,
      })
    }

    return { frames, totalLogicalChunks: totalChunks }
  }
}

function defaultSlicePayload(payload: Uint8Array, maxChunkPayloadBytes: number): Uint8Array[] {
  if (maxChunkPayloadBytes <= 0) throw new Error("maxChunkPayloadBytes must be > 0")
  if (payload.length === 0) return []
  const chunks: Uint8Array[] = []
  for (let i = 0; i < payload.length; i += maxChunkPayloadBytes) {
    chunks.push(payload.slice(i, i + maxChunkPayloadBytes))
  }
  return chunks
}

/* =====================================================================================
 * Section 7) SimpleDriver（内置：你们当前默认 device/reportId 选择 + 默认 pktIndex 策略）
 * ===================================================================================== */

export type SimpleDriverOptions = {
  // 设备/Report 选择规则（可覆盖）
  pickDevice?: (devices: HIDDevice[], hint?: string) => HIDDevice
  pickReportId?: (device: HIDDevice, collection: HIDCollectionInfo) => number

  // 解析 status
  parseStatus?: (bytes: Uint8Array) => { ok: boolean, status?: number }

  // checksum 仅对“实际字段”计算
  computeChecksum: (args: { reportId: number, bytesForChecksum: Uint8Array }) => number

  // 字段布局
  typeOffset?: number
  pktIndexOffset?: number
  payloadOffset?: number
  statusOffset?: number

  // pktIndex 序列策略（可覆盖）
  buildPktIndexSequence?: (totalChunks: number) => number[]
}

export function createSimpleDriver(opts: SimpleDriverOptions): HidDriver {
  const typeOffset = opts.typeOffset ?? 0
  const pktIndexOffset = opts.pktIndexOffset ?? 1
  const payloadOffset = opts.payloadOffset ?? 2
  const statusOffset = opts.statusOffset ?? 2

  const getMaxChunkPayloadBytes = (packetSize: number) => {
    const lastPayloadIndex = packetSize - 2 // 最后一字节是 checksum
    return Math.max(0, lastPayloadIndex - payloadOffset + 1)
  }

  const buildPacket = (args: {
    reportId: number
    packetSize: number
    type: number
    pktIndex: number
    totalChunks: number
    chunkPayload: Uint8Array
  }) => {
    const buf = new Uint8Array(args.packetSize)
    buf[typeOffset] = args.type & 0xff
    buf[pktIndexOffset] = args.pktIndex & 0xff

    const maxChunk = getMaxChunkPayloadBytes(args.packetSize)
    if (args.chunkPayload.length > maxChunk) throw new Error(`chunkPayload too large: ${args.chunkPayload.length} > ${maxChunk}`)
    buf.set(args.chunkPayload, payloadOffset)

    const lastMeaningfulIndex = args.chunkPayload.length > 0
        ? payloadOffset + args.chunkPayload.length - 1
        : Math.max(typeOffset, pktIndexOffset)

    const bytesForChecksum = buf.slice(0, lastMeaningfulIndex + 1)
    buf[args.packetSize - 1] = opts.computeChecksum({ reportId: args.reportId, bytesForChecksum }) & 0xff

    return buf
  }

  // ✅ 你的默认策略：
  // - 单包（totalChunks=1）=> [0]
  // - 多包（totalChunks=N）=> [N-1, N-2, ..., 1, 0]
  const defaultSeq = (totalChunks: number) => {
    if (totalChunks <= 1) return [0]
    const seq: number[] = []
    for (let i = totalChunks - 1; i >= 1; i--) seq.push(i)
    seq.push(0)
    return seq
  }

  const planner = createChunkPlanner({
    getMaxChunkPayloadBytes,
    buildPacket,
    buildPktIndexSequence: opts.buildPktIndexSequence ?? defaultSeq,
  })

  return {
    name: "simple-driver",

    /** 获取设备对象 */
    pickDevice(devices: HIDDevice[], hint?: string): HIDDevice {
      return (opts.pickDevice ?? ((ds) => {
        for (const d of ds) {
          if (hasNonEmptyReports(d)) return d
        }
        return ds[0]
      }))(devices, hint)
    },

    /** 选择输出报告Id */
    pickOutputReportId(device: HIDDevice): number {
      const c = pickFirstCollectionWithInOut(device)
      if (!c) throw new Error("Cannot find a collection with both inputReports and outputReports")
      const pick = opts.pickReportId ?? ((_, col) => col.outputReports![0].reportId!)
      const reportId = pick(device, c)
      if (typeof reportId !== "number") throw new Error("pickReportId must return a number")
      return reportId
    },

    /** 尝试解析输入数据报告 */
    tryParseInputReport(args: { device: HIDDevice, reportId: number, data: DataView, packetSize: number }): HidParsedIncoming | null {
      const bytes = new Uint8Array(args.data.buffer.slice(args.data.byteOffset, args.data.byteOffset + args.data.byteLength))
      if (bytes.length !== args.packetSize) return null

      const type = bytes[typeOffset]
      const pktIndex = bytes[pktIndexOffset]
      const { ok, status } = (opts.parseStatus ?? ((b) => ({ ok: b[statusOffset] === 0, status: b[statusOffset] })))(bytes)

      return {
        kind: "response",
        type,
        pktIndex,
        ok,
        status,
        payload: { bytes },
        raw: { reportId: args.reportId, data: bytes },
      }
    },

    /** 匹配响应 */
    matchResponse(incoming: HidParsedIncoming, meta: OutgoingChunkMeta): boolean {
      return incoming.kind === "response" && incoming.type === meta.type && incoming.pktIndex === meta.pktIndex
    },

    /** 构建区块计划 */
    buildChunkPlan(args: { device: HIDDevice, reportId: number, packetSize: number, type: number, payload: Uint8Array }): ChunkPlan {
      return planner({
        reportId: args.reportId,
        packetSize: args.packetSize,
        type: args.type,
        payload: args.payload,
      })
    },
  }
}

/* =====================================================================================
 *  scyrox 鼠标的数据校验方法：
 * ===================================================================================== */

export function scyroxChecksum(args: {
  reportId: number
  bytesForChecksum: Uint8Array
}): number {
  let v = args.reportId & 0xff
  for (const b of args.bytesForChecksum) v = (v + (b & 0xff)) & 0xff
  return v & 0xff
}

/* =====================================================================================
 * 注册 + 工厂 功能整合
 * ===================================================================================== */

type DriverKey = `${number}:${number}`
const driverRegistry = new Map<DriverKey, HidDriver>()

export function registerDriver(options: { vendorId: number, productId: number, driver: HidDriver }) {
  driverRegistry.set(`${options.vendorId}:${options.productId}`, options.driver)
}

export function createHidSuite(options: HidSuiteOptions): HidSuite {
  const key: DriverKey = `${options.vendorId}:${options.productId}`
  const driver = driverRegistry.get(key)
  if (!driver) throw new Error(`No driver registered for vendorId=${options.vendorId}, productId=${options.productId}`)
  return new HidSuite(options, driver)
}
