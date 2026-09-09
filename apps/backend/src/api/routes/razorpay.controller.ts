import {
  Controller,
  HttpException,
  Post,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RazorpayService } from '@gitroom/nestjs-libraries/services/razorpay.service';

@ApiTags('Razorpay')
@Controller('/razorpay')
export class RazorpayController {
  constructor(private readonly _razorpayService: RazorpayService) {}

  @Post('/')
  async webhook(@Req() req: RawBodyRequest<Request>) {
    try {
      const event = this._razorpayService.validateWebhook(
        req.rawBody,
        // @ts-ignore
        req.headers['x-razorpay-signature']
      );
      return await this._razorpayService.processWebhook(event);
    } catch (e) {
      if (e instanceof HttpException) {
        throw e;
      }
      throw new HttpException(e, 500);
    }
  }
}
