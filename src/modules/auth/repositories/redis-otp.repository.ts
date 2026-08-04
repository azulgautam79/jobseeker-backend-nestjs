import { Injectable } from "@nestjs/common";
import { OtpRepository } from "./otp.repository";
import { RedisService } from "../../redis/redis.service";
import { OtpType } from "../../../common/enums/otpType";
import { CacheKeys } from "../../../common/cache/cache.keys";
import { SaveOtpOptions } from "../dto/save-otpOption.dto";
import { Trace } from "../../../common/telemetry/tracing/trace.decorator";

@Injectable()
export class RedisOtpRepository implements OtpRepository {
    constructor(
        private readonly redisService: RedisService,
    ) { }


    private getKey(userId: string, type: OtpType): string {
        return CacheKeys.otp(userId, type);
    }

    @Trace('authv2.otp.save')
    async saveOtp(options: SaveOtpOptions): Promise<void> {
        await this.redisService.set(
            this.getKey(options.userId, options.type),
            options.hashedOtp,
            options.ttl
        )
    }

    @Trace('authv2.otp.find')
    async getOtp(userId: string, type: OtpType): Promise<string | null> {
        return this.redisService.get<string>(
            this.getKey(userId, type),
        )
    }

    @Trace('authv2.otp.delete')
    async deleteOtp(userId: string, type: OtpType): Promise<void> {
        await this.redisService.del(
            this.getKey(userId, type),
        );
    }




}