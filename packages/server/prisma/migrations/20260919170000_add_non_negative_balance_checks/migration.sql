-- Defesa em profundidade: saldo nunca pode ficar negativo. A aplicação já valida
-- saldo antes de debitar, mas uma corrida entre requests ou um bug futuro não
-- deve conseguir persistir dinheiro negativo — o banco é o árbitro final.
ALTER TABLE "Portfolio"
  ADD CONSTRAINT "Portfolio_balance_non_negative" CHECK (balance >= 0);

ALTER TABLE "CurrencyHolding"
  ADD CONSTRAINT "CurrencyHolding_balance_non_negative" CHECK (balance >= 0);

ALTER TABLE "SavingsBox"
  ADD CONSTRAINT "SavingsBox_balance_non_negative" CHECK (balance >= 0);
