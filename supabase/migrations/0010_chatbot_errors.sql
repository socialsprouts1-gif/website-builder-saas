-- Why the assistant did not answer.
--
-- A visitor must never see a provider error, so the widget says something
-- neutral. That left the owner with no way at all to find out what went wrong:
-- the reason was caught and thrown away. It is recorded here instead, and shown
-- on the Chatbot tab to the person who can act on it.

alter table public.chatbots add column if not exists last_error text;
alter table public.chatbots add column if not exists last_error_at timestamptz;
