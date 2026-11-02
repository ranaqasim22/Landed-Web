import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MailProcessor } from './mail.processor.js';

vi.mock('nodemailer', () => ({ createTransport: vi.fn(() => ({ sendMail: vi.fn() })) }));

const mailpit = {
  MAIL_FROM: 'Landed <no-reply@landed.local>',
  SMTP_HOST: 'mailpit',
  SMTP_PORT: '1025',
};

describe('MailProcessor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('connects without a login when no SMTP user is set', () => {
    new MailProcessor(new ConfigService(mailpit));
    expect(createTransport).toHaveBeenCalledWith({ host: 'mailpit', port: 1025 });
  });

  it('treats an empty SMTP user the same as none, as Docker passes it', () => {
    new MailProcessor(new ConfigService({ ...mailpit, SMTP_USER: '', SMTP_PASS: '' }));
    expect(createTransport).toHaveBeenCalledWith({ host: 'mailpit', port: 1025 });
  });

  it('logs in over encryption when an SMTP user is set', () => {
    new MailProcessor(
      new ConfigService({
        ...mailpit,
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: '587',
        SMTP_USER: 'me@gmail.com',
        SMTP_PASS: 'app-password',
      }),
    );
    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.gmail.com',
      port: 587,
      auth: { user: 'me@gmail.com', pass: 'app-password' },
      requireTLS: true,
    });
  });

  it('refuses to start with a user but no password', () => {
    expect(
      () => new MailProcessor(new ConfigService({ ...mailpit, SMTP_USER: 'me@gmail.com' })),
    ).toThrow();
  });
});
