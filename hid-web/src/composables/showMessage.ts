import { ElMessage } from 'element-plus';

export const showMessage = (message: string) => {
  ElMessage({
    dangerouslyUseHTMLString: true,
    customClass: 'custom-class-el-message',
    duration: 1000,
    offset: 0,
    appendTo: '.middle-container',
    message: `
      <div class="custom-message-container">
        <div class="custom-message-container-text">
          ${message}
        </div>
      </div>
    `,
  });
};
