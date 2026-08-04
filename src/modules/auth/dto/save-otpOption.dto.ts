import { OtpType } from "../../../common/enums/otpType";

export class SaveOtpOptions{
    userId!: string;
    type!: OtpType;
    hashedOtp!: string;
    ttl!: number;
}