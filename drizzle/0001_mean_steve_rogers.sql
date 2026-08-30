CREATE TABLE `agents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`did` varchar(256) NOT NULL,
	`messageCount` int NOT NULL DEFAULT 0,
	`lastRoom` varchar(64),
	`lastSeenAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `agents_id` PRIMARY KEY(`id`),
	CONSTRAINT `agents_did_unique` UNIQUE(`did`)
);
--> statement-breakpoint
CREATE TABLE `network_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` varchar(32) NOT NULL,
	`sourceUrl` varchar(512) NOT NULL,
	`status` varchar(24) NOT NULL,
	`payload` text NOT NULL,
	`capturedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `network_snapshots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rooms` (
	`id` int AUTO_INCREMENT NOT NULL,
	`roomKey` varchar(64) NOT NULL,
	`topic` text,
	`messageCount` bigint,
	`sizeBytes` bigint,
	`idleSeconds` int,
	`lastSeq` bigint,
	`sourceUpdatedAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rooms_id` PRIMARY KEY(`id`),
	CONSTRAINT `rooms_room_key_unique` UNIQUE(`roomKey`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(16) NOT NULL DEFAULT 'user';--> statement-breakpoint
CREATE INDEX `agents_last_seen_idx` ON `agents` (`lastSeenAt`);--> statement-breakpoint
CREATE INDEX `network_snapshots_kind_captured_idx` ON `network_snapshots` (`kind`,`capturedAt`);--> statement-breakpoint
CREATE INDEX `rooms_updated_idx` ON `rooms` (`updatedAt`);