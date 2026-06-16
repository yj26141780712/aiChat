import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private from: string;

  constructor(private config: ConfigService) {
    const smtpHost = config.get('SMTP_HOST');
    const smtpPort = Number(config.get('SMTP_PORT') || 465);
    const smtpUser = config.get('SMTP_USER');
    const smtpPass = config.get('SMTP_PASS');

    console.log(`SMTP 配置: host=${smtpHost}, port=${smtpPort}, user=${smtpUser}`);

    this.transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: true, // 465 端口使用 SSL
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        // SSL/TLS 安全选项
        rejectUnauthorized: false, // 允许自签名证书
        minVersion: 'TLSv1.2',
      },
      // 调试日志
      debug: true,
      logger: true,
    });

    // 验证 SMTP 连接是否成功
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP 连接验证失败:', error.message);
      } else {
        console.log('SMTP 连接验证成功，可以发送邮件');
      }
    });

    this.from = `"杨杰" <${smtpUser}>`;
  }

  /** 发送邮箱验证邮件 */
  async sendVerifyEmail(to: string, token: string): Promise<void> {
    const verifyUrl = `${this.config.get('FRONTEND_URL')}/verify-email?token=${token}`;

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject: '请验证您的邮箱',
        text: `请复制以下链接到浏览器验证邮箱：${verifyUrl}`,
        html: `
          <h2>邮箱验证</h2>
          <p>请点击以下链接验证您的邮箱（24 小时内有效）：</p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#1a73e8;color:white;text-decoration:none;border-radius:6px;">
            验证邮箱
          </a>
          <p style="color:#666;font-size:12px;margin-top:20px;">如果按钮无法点击，请复制以下链接到浏览器：<br>${verifyUrl}</p>
        `,
      });
      console.log(`验证邮件已发送至 ${to}, messageId: ${info.messageId}`);
    } catch (error) {
      console.error(`发送验证邮件至 ${to} 失败:`, error.message);
      throw error;
    }
  }

  /** 发送重置密码邮件 */
  async sendResetPassword(to: string, token: string): Promise<void> {
    const resetUrl = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;

    try {
      const info = await this.transporter.sendMail({
        from: this.from,
        to,
        subject: '重置密码',
        text: `请点击以下链接重置密码：${resetUrl}`,
        html: `
          <h2>重置密码</h2>
          <p>请点击以下链接重置您的密码（1 小时内有效）：</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#e8731a;color:white;text-decoration:none;border-radius:6px;">
            重置密码
          </a>
          <p style="color:#666;font-size:12px;margin-top:20px;">如果不是您本人操作，请忽略此邮件。</p>
        `,
      });
      console.log(`重置密码邮件已发送至 ${to}, messageId: ${info.messageId}`);
    } catch (error) {
      console.error(`发送重置密码邮件至 ${to} 失败:`, error.message);
      throw error;
    }
  }
}
