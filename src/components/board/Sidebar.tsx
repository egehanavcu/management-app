import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { SidebarNav } from "./SidebarNav";

export async function Sidebar() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const memberships = await prisma.boardMember.findMany({
    where: { userId: session.user.id },
    include: { board: { select: { id: true, title: true } } },
    orderBy: { createdAt: "desc" },
  });

  const boards = memberships.map((m) => ({
    id: m.board.id,
    title: m.board.title,
    role: m.role,
  }));

  return (
    <SidebarNav
      boards={boards}
      user={{
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
      }}
    />
  );
}
