-- The voice agent.
--
-- Off by default and the owner's own key only, deliberately. A spoken
-- conversation is open-ended — there is no "ten replies" to count when
-- somebody can talk for four minutes — so metering it fairly would mean
-- billing by the second, which is a product decision nobody has made. Text
-- keeps the free allowance; voice is something a site turns on with its own
-- key.

alter table public.chatbots add column if not exists voice_enabled boolean not null default false;
alter table public.chatbots add column if not exists voice_id text not null default 'alloy';
