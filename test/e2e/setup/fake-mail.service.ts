export class FakeMailService {
  async sendVerificationOtp() {
    return await Promise.resolve(true);
  }

  async sendForgotPasswordOtp() {
    return await Promise.resolve(true);
  }

  async sendMail() {
    return await Promise.resolve(true);
  }
}
