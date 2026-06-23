import nodemailer from 'nodemailer';
import { config } from '../config';

let transporter: nodemailer.Transporter | null = null;

const getTransporter = (): nodemailer.Transporter => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }
  return transporter;
};

export const sendVerificationEmail = async (email: string, code: string): Promise<void> => {
  // 测试环境或邮件配置不完整时，仅打印验证码
  if (config.nodeEnv === 'test' || !config.email.user || !config.email.pass ||
      config.email.user === 'noreply@example.com') {
    console.log(`[开发模式] 验证码: ${code} (发送至 ${email})`);
    return;
  }

  const transport = getTransporter();
  await transport.sendMail({
    from: config.email.from,
    to: email,
    subject: '小说阅读器 - 验证码',
    html: `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h2>小说阅读器验证码</h2>
        <p>您的验证码是：</p>
        <h1 style="color: #1890ff; font-size: 32px; letter-spacing: 4px;">${code}</h1>
        <p>验证码 5 分钟内有效，请勿泄露给他人。</p>
        <p>如非本人操作，请忽略此邮件。</p>
      </div>
    `,
  });
};
