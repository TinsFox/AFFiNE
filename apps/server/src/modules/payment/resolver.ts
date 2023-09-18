import { InternalServerErrorException } from '@nestjs/common';
import {
  Args,
  Field,
  Mutation,
  ObjectType,
  Parent,
  registerEnumType,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { User, UserSubscription } from '@prisma/client';

import { PaymentRecurringPlan } from '../../config';
import { PrismaService } from '../../prisma';
import { CurrentUser } from '../auth';
import { UserType } from '../users';
import { PaymentService } from './service';

enum UserSubscriptionStatus {
  Trialing,
  Active,
  Expired,
}

registerEnumType(UserSubscriptionStatus, { name: 'UserSubscriptionStatus' });
registerEnumType(PaymentRecurringPlan, { name: 'PaymentRecurringPlan' });

@ObjectType('UserSubscription')
class UserSubscriptionType implements Partial<UserSubscription> {
  @Field()
  plan!: PaymentRecurringPlan;

  @Field()
  status!: UserSubscriptionStatus;

  @Field({ nullable: true })
  trialStartedAt?: Date | null;

  @Field({ nullable: true })
  trialEndedAt?: Date | null;

  @Field()
  startedAt!: Date;

  @Field({ nullable: true })
  endedAt!: Date | null;
}

@Resolver(() => UserSubscriptionType)
export class PaymentResolver {
  constructor(private readonly service: PaymentService) {}

  @Mutation(() => String, {
    description: 'Create a subscription checkout link of stripe',
  })
  async checkout(
    @CurrentUser() user: User,
    @Args({ type: () => PaymentRecurringPlan }) plan: PaymentRecurringPlan
  ) {
    const session = await this.service.checkout(user, plan);

    if (!session.url) {
      throw new InternalServerErrorException(
        'Failed to create checkout session'
      );
    }

    return session.url;
  }

  @ResolveField(() => UserSubscriptionStatus)
  status(@Parent() sub: UserSubscriptionType) {
    const now = new Date();
    if (!sub.endedAt || sub.endedAt < now) {
      return UserSubscriptionStatus.Expired;
    } else if (
      sub.trialEndedAt &&
      sub.trialEndedAt > now &&
      sub.startedAt > now
    ) {
      return UserSubscriptionStatus.Trialing;
    } else {
      return UserSubscriptionStatus.Active;
    }
  }
}

@Resolver(() => UserType)
export class UserSubscriptionResolver {
  constructor(private readonly db: PrismaService) {}

  @ResolveField(() => UserSubscriptionType, { nullable: true })
  async subscription(
    @Parent() user: User
  ): Promise<UserSubscriptionType | null> {
    const sub = await this.db.userLastSubscription.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!sub || (sub.end && sub.end < new Date())) {
      return null;
    }

    // @ts-expect-error cast string to plan enum
    return sub;
  }
}
