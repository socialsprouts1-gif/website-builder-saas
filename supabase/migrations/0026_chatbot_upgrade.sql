-- The chatbot grows up.
--
-- Four things, and the first one is a bug fix rather than a feature: a
-- freshly built site had a chat bubble on it whose only honest answer was
-- "I don't have any site content indexed yet", because indexing only ever ran
-- from the owner pressing Save. `indexed_at` is what lets a build say whether
-- it has done that yet.

alter table public.chatbots add column if not exists avatar_url text;
alter table public.chatbots add column if not exists avatar_preset text;
alter table public.chatbots add column if not exists theme text not null default 'clean';
alter table public.chatbots add column if not exists faq text;
alter table public.chatbots add column if not exists indexed_at timestamptz;
alter table public.chatbots add column if not exists chunk_count integer not null default 0;

-- Answering a visitor costs money, so it is metered like everything else.
--
-- Separate from build credits on purpose: a site owner who has spent their
-- build credits still wants the assistant on their live site answering
-- customers, and a visitor's question is not the owner's generation. Counted
-- per month per chatbot, reset by comparing the period rather than by a job.
alter table public.chatbots add column if not exists replies_used integer not null default 0;
alter table public.chatbots add column if not exists replies_period text;

-- The owner's own LLM key for the assistant, encrypted, so a busy site can
-- carry on past the free allowance without Lumen paying for it.
alter table public.chatbots add column if not exists own_key_cipher text;
alter table public.chatbots add column if not exists own_key_hint text;

create index if not exists chatbots_project_idx on public.chatbots (project_id);
