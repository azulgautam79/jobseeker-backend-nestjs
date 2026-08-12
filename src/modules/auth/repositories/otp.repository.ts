import { OtpType } from "../../../common/enums/otpType"
import { SaveOtpOptions } from "../dto/save-otpOption.dto";

export abstract class OtpRepository {
    abstract saveOtp(options:SaveOtpOptions): Promise<void>;

    abstract getOtp(
        userId: string,
        type: OtpType,
    ): Promise<string | null>;

    abstract deleteOtp(
        userId: string,
        type: OtpType
    ): Promise<void>;
}