import * as userRepository from "../repositories/user.repository.ts";

export function listUsers(role: "CUSTOMER" | "AGENT") {
  return userRepository.findUsersByRole(role);
}
