import { customerDel, customerGet, customerPost, customerPut } from "@/lib/customer-api";

type Row = Record<string, unknown>;
const text = (value: unknown) => (value == null ? "" : String(value));

export type PayoutChannel = "easypaisa" | "jazzcash" | "bank" | "raast";

/** A provider's receiving account; the number comes back masked (e.g. 0300XXXX567). */
export type ReceivingAccount = {
  id: string;
  channel: PayoutChannel;
  label: string;
  accountTitle: string;
  displayIdentifier: string;
  bankName: string;
  branch: string;
  instructions: string;
  active: boolean;
};

export type AccountInput = {
  channel: PayoutChannel;
  label: string;
  accountTitle: string;
  identifier: string;
  bankName?: string;
  branch?: string;
  instructions?: string;
};

function mapAccount(a: Row): ReceivingAccount {
  return {
    id: text(a.id ?? a._id),
    channel: text(a.channel) as PayoutChannel,
    label: text(a.label),
    accountTitle: text(a.accountTitle),
    displayIdentifier: text(a.displayIdentifier ?? a.identifier),
    bankName: text(a.bankName),
    branch: text(a.branch),
    instructions: text(a.instructions),
    active: a.active !== false,
  };
}

/** `GET /payments/accounts/me` — the same list the app's "Payment accounts" shows. */
export async function getReceivingAccounts(): Promise<ReceivingAccount[]> {
  const data = await customerGet<unknown>("/payments/accounts/me");
  return (Array.isArray(data) ? (data as Row[]) : []).map(mapAccount);
}

const clean = (input: Partial<AccountInput>) => ({
  ...input,
  label: input.label?.trim(),
  accountTitle: input.accountTitle?.trim(),
  identifier: input.identifier?.replace(/[\s-]/g, "").trim(),
  bankName: input.bankName?.trim() || undefined,
  branch: input.branch?.trim() || undefined,
  instructions: input.instructions?.trim() || undefined,
});

export async function addReceivingAccount(input: AccountInput) {
  return mapAccount(await customerPost<Row>("/payments/accounts/me", clean(input)));
}

/** The channel can't change after adding; everything else can. */
export async function updateReceivingAccount(id: string, input: Partial<Omit<AccountInput, "channel">> & { active?: boolean }) {
  const { identifier, ...rest } = clean(input);
  // Leave the number unchanged when the field is left empty (it's shown masked).
  return mapAccount(await customerPut<Row>(`/payments/accounts/me/${id}`, identifier ? { ...rest, identifier } : rest));
}

export async function removeReceivingAccount(id: string) {
  await customerDel(`/payments/accounts/me/${id}`);
}

export type PaymentRecord = {
  id: string;
  bookingId: string;
  amount: number;
  method: string;
  status: string;
  reference: string;
  createdAt: string;
  paidAt: string;
};

/** Payments travellers made to this provider, newest first. */
export async function getPaymentHistory(limit = 30): Promise<PaymentRecord[]> {
  const data = await customerGet<unknown>("/payments", { params: { limit } });
  const items = (Array.isArray(data) ? data : Array.isArray((data as Row)?.items) ? (data as Row).items : []) as Row[];
  return items.map((p) => ({
    id: text(p.id ?? p._id),
    bookingId: text(p.bookingId),
    amount: Number(p.amount) || 0,
    method: text(p.method),
    status: text(p.status),
    reference: text((p.proof as Row | undefined)?.referenceNumber ?? p.transactionId),
    createdAt: text(p.createdAt),
    paidAt: text(p.paidAt ?? p.confirmedAt),
  }));
}
