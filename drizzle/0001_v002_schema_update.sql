-- v0.0.2 schema changes

-- Add role to users
ALTER TABLE `users` ADD COLUMN `role` text NOT NULL DEFAULT 'user';

-- Add status to products
ALTER TABLE `products` ADD COLUMN `status` text NOT NULL DEFAULT 'approved';

-- Create comments table
CREATE TABLE IF NOT EXISTS `comments` (
  `id` text PRIMARY KEY NOT NULL,
  `userId` text NOT NULL,
  `productId` text NOT NULL,
  `content` text NOT NULL,
  `createdAt` text NOT NULL,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE
);
