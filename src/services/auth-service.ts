import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";

/**
 * Checks if the user who triggered the interaction is an Admin 
 * or has a specific "Moderator" role.
 */
export const isAuthorized = (interaction: ChatInputCommandInteraction): boolean => {
  if (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  const roles = interaction.member?.roles;
  if (roles && 'cache' in roles) {
    return roles.cache.some(role => 
      role.name === "Moderator" || role.name === "Admin"
    );
  }

  return false;
};