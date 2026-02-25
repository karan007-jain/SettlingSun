import { z } from "zod";
import bcrypt from "bcryptjs";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";

export const userRouter = createTRPCRouter({
  // Get all users (admin only)
  getAll: adminProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }),

  // Create user (admin only)
  create: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(6),
        role: z.enum(["ADMIN", "MANAGER", "USER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existingUser = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const hashedPassword = await bcrypt.hash(input.password, 10);

      return await ctx.prisma.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          role: input.role,
        },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });
    }),

  // Update user (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          email: z.string().email().optional(),
          password: z.string().min(6).optional(),
          role: z.enum(["ADMIN", "MANAGER", "USER"]).optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: any = {};

      if (input.data.email) {
        // Check if email is already taken by another user
        const existingUser = await ctx.prisma.user.findUnique({
          where: { email: input.data.email },
        });

        if (existingUser && existingUser.id !== input.id) {
          throw new Error("Email is already in use");
        }

        updateData.email = input.data.email;
      }

      if (input.data.password) {
        updateData.password = await bcrypt.hash(input.data.password, 10);
      }

      if (input.data.role) {
        updateData.role = input.data.role;
      }

      return await ctx.prisma.user.update({
        where: { id: input.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          role: true,
          updatedAt: true,
        },
      });
    }),

  // Delete user (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent deleting yourself
      if (ctx.session?.user?.id === input.id) {
        throw new Error("You cannot delete your own account");
      }

      return await ctx.prisma.user.delete({
        where: { id: input.id },
      });
    }),
});
