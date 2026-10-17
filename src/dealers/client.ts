import { api } from "../shared/client";

const dealerAccessHeader = "x-dealer-access";

export type DealerClient = <T>(
  route: string,
  body?: unknown,
  method?: string,
) => Promise<T>;

export function dealerClient(token: string): DealerClient {
  return (route, body, method) =>
    api(route, body, method, { [dealerAccessHeader]: token });
}
