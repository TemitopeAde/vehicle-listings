/** Login email from the current site member. Empty when nobody is logged in. */
export async function readLoginEmail() {
  const { currentMember } = await import("@wix/site-members");
  const member = await currentMember.getMember({ fieldsets: ["FULL"] });
  return member?.loginEmail?.trim() ?? "";
}
