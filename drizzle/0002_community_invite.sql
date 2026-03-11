-- v0.0.3 community invite tracking

ALTER TABLE `users` ADD COLUMN `wechatInvited` integer NOT NULL DEFAULT 0;
ALTER TABLE `users` ADD COLUMN `telegramInvited` integer NOT NULL DEFAULT 0;
