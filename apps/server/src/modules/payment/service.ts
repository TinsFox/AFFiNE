import { Injectable, Logger } from '@nestjs/common';
import { OnEvent as RawOnEvent } from '@nestjs/event-emitter';
import { User } from '@prisma/client';
import Stripe from 'stripe';

import { Config, PaymentRecurringPlan } from '../../config';
import { PrismaService } from '../../prisma';

const OnEvent = (
  event: Stripe.Event.Type,
  opts?: Parameters<typeof RawOnEvent>[1]
) => RawOnEvent(event, opts);

@Injectable()
export class PaymentService {
  private readonly paymentConfig: Config['payment'];
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly config: Config,
    private readonly stripe: Stripe,
    private readonly db: PrismaService
  ) {
    this.paymentConfig = config.payment;

    if (
      !this.paymentConfig.stripe.keys.APIKey ||
      !this.paymentConfig.stripe.keys.webhookKey /* default empty string */
    ) {
      this.logger.warn('Stripe API key not set, Stripe will be disabled');
      this.logger.warn('Set STRIPE_API_KEY to enable Stripe');
    }
  }

  async checkout(user: User, plan: PaymentRecurringPlan) {
    const session = await this.stripe.checkout.sessions.create({
      line_items: [
        {
          price: this.paymentConfig.stripe.prices[plan],
          quantity: 1,
        },
      ],
      subscription_data: {
        // TBD: Free trial?
        trial_period_days: plan === PaymentRecurringPlan.Monthly ? 7 : 14,
      },
      allow_promotion_codes: true,
      tax_id_collection: {
        enabled: true,
      },
      mode: 'subscription',
      success_url: this.config.baseUrl + '/payment/success',
      customer_email: user.email,
    });

    await this.db.userSubscription.create({
      data: {
        userId: user.id,
        plan,
        sessionId: session.id,
      },
    });

    return session;
  }

  @OnEvent('checkout.session.completed')
  async onPayed(session: Stripe.Checkout.Session) {
    this.logger.log(`Payed: ${session.id}`);

    if (!session.customer_email) {
      this.logger.error(`No customer email in session: ${session.id}`);
      return;
    }

    const record = await this.db.userSubscription.findUnique({
      where: {
        sessionId: session.id,
      },
      include: {
        user: true,
      },
    });

    if (!record) {
      this.logger.error(
        `Given session id ${session.id} does not exist in database`
      );
      return;
    }

    // leave the availability to make non-subscription payments,
    // like for business plans?
    if (!record.end && typeof session.subscription === 'string') {
      const sub = await this.stripe.subscriptions.retrieve(
        session.subscription
      );

      await this.db.userSubscription.update({
        where: {
          id: record.id,
        },
        data: {
          price: session.amount_total,
          currency: session.currency,
          trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : null,
          trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          start: sub.current_period_start
            ? new Date(sub.current_period_start * 1000)
            : null,
          end: sub.current_period_end
            ? new Date(sub.current_period_end * 1000)
            : null,
        },
      });
    }
  }
}
