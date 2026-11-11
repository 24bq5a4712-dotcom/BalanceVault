function selectFields(record, select) {
  if (!select) return structuredClone(record);
  return Object.fromEntries(
    Object.keys(select)
      .filter((field) => select[field] && field in record)
      .map((field) => [field, structuredClone(record[field])]),
  );
}

function matches(record, where = {}) {
  return Object.entries(where).every(([field, value]) => record[field] === value);
}

export class MemoryDatabase {
  users = [];
  accounts = [];
  auditLogs = [];

  constructor() {
    this.user = {
      count: async ({ where } = {}) => this.users.filter((user) => matches(user, where)).length,
      findUnique: async ({ where, select }) => {
        const record = this.users.find((user) => matches(user, where));
        return record ? selectFields(record, select) : null;
      },
      findMany: async ({ select, orderBy } = {}) => {
        const records = [...this.users];
        if (orderBy?.createdAt === "desc") records.reverse();
        return records.map((record) => selectFields(record, select));
      },
      create: async ({ data, select }) => {
        if (this.users.some((user) => user.email === data.email)) {
          const error = new Error("Unique constraint failed.");
          error.code = "P2002";
          throw error;
        }
        const now = new Date();
        const record = {
          id: `user-${this.users.length + 1}`,
          role: "HOLDER",
          status: "ACTIVE",
          mustChangePassword: false,
          createdAt: now,
          updatedAt: now,
          ...structuredClone(data),
        };
        this.users.push(record);
        return selectFields(record, select);
      },
      update: async ({ where, data, select }) => {
        const record = this.users.find((user) => matches(user, where));
        if (!record) {
          const error = new Error("Record not found.");
          error.code = "P2025";
          throw error;
        }
        Object.assign(record, structuredClone(data), { updatedAt: new Date() });
        return selectFields(record, select);
      },
    };

    this.account = {
      findMany: async ({ where, select } = {}) =>
        this.accounts.filter((account) => matches(account, where))
          .map((account) => selectFields(account, select)),
      findFirst: async ({ where, select }) => {
        const record = this.accounts.find((account) => matches(account, where));
        return record ? selectFields(record, select) : null;
      },
      create: async ({ data, select }) => {
        const now = new Date();
        const record = {
          id: `account-${this.accounts.length + 1}`,
          institution: null,
          currency: "USD",
          balance: "0.0000",
          status: "ACTIVE",
          createdAt: now,
          updatedAt: now,
          ...structuredClone(data),
        };
        this.accounts.push(record);
        return selectFields(record, select);
      },
      update: async ({ where, data, select }) => {
        const record = this.accounts.find((account) => matches(account, where));
        if (!record) {
          const error = new Error("Record not found.");
          error.code = "P2025";
          throw error;
        }
        Object.assign(record, structuredClone(data), { updatedAt: new Date() });
        return selectFields(record, select);
      },
    };

    this.auditLog = {
      create: async ({ data }) => {
        const record = {
          id: `audit-${this.auditLogs.length + 1}`,
          createdAt: new Date(),
          ...structuredClone(data),
        };
        this.auditLogs.push(record);
        return structuredClone(record);
      },
      findMany: async ({ take = 50, select } = {}) =>
        [...this.auditLogs]
          .reverse()
          .slice(0, take)
          .map((record) => selectFields(record, select)),
    };
  }

  async $transaction(callback) {
    return callback(this);
  }

  async $queryRaw() {
    throw new Error("Test database is intentionally unavailable.");
  }
}
