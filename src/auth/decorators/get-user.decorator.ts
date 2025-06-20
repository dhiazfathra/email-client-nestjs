import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator to extract the user from the request object
 * Usage: @GetUser() user: User
 * Or to get a specific field: @GetUser('email') email: string
 */
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    return getUserFactory(data, ctx);
  },
);

// Extract the factory function from the GetUser decorator for testing
// This is a workaround since we can't directly access the factory function
export const getUserFactory = (
  data: string | undefined,
  ctx: ExecutionContext,
) => {
  const request = ctx.switchToHttp().getRequest();
  if (data) {
    return request.user?.[data];
  }
  return request.user;
};
