import { onUnmounted } from "vue";

export function useMouseTrail(options?: {
  size?: number; // 轨迹大小
  color?: string; // 颜色，可指定或随机
  lifetime?: number; // 轨迹显示时间(ms)
}) {
  const defaultOptions = {
    size: 10,
    color: "random", // 也可以指定一个颜色，比如 "#fff"
    lifetime: 300,
  };
  const finalOptions = { ...defaultOptions, ...options };

  // 事件处理函数
  const handleMouseMove = (e: MouseEvent) => {
    console.log("handleMouseMove=====")
    const trail = document.createElement("div");
    trail.style.position = "fixed";
    trail.style.pointerEvents = "none";
    trail.style.borderRadius = "50%";
    trail.style.width = `${finalOptions.size}px`;
    trail.style.height = `${finalOptions.size}px`;
    trail.style.left = e.clientX + "px";
    trail.style.top = e.clientY + "px";
    trail.style.transform = "translate(-50%, -50%)";
    trail.style.willChange = "transform, opacity";
    trail.style.transition = "transform 0.1s ease, opacity 0.3s ease";
    trail.style.background =
      finalOptions.color === "random"
        ? `hsl(${Math.random() * 360}, 70%, 70%)`
        : finalOptions.color;

    document.body.appendChild(trail);

    setTimeout(() => {
      trail.style.opacity = "0";
      setTimeout(() => {
        trail.remove();
      }, 300);
    }, finalOptions.lifetime - 300);
  };

  // 启动监听
  const start = () => {
    document.addEventListener("mousemove", handleMouseMove);
  };

  // 卸载监听
  const stop = () => {
    document.removeEventListener("mousemove", handleMouseMove);
  };

  // Vue 生命周期集成
  // onMounted(start);
  onUnmounted(stop);

  return { start, stop };
}
