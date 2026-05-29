import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findById(id: bigint): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async updateProfile(userId: bigint, dto: import('./dto/update-user.dto').UpdateUserDto): Promise<User> {
    const { fullName, phone, dateOfBirth, gender } = dto;
    
    // Create the data object for user table update
    const userDataToUpdate: Prisma.UserUpdateInput = {};
    if (fullName !== undefined) userDataToUpdate.fullName = fullName;
    if (phone !== undefined) userDataToUpdate.phone = phone;

    // We use a transaction to ensure both updates succeed or fail together
    return this.prisma.$transaction(async (tx) => {
      // 1. Update User
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: userDataToUpdate,
      });

      // 2. Upsert CustomerProfile if dateOfBirth or gender are provided
      if (dateOfBirth !== undefined || gender !== undefined) {
        const profileDataToUpdate: any = {};
        if (dateOfBirth !== undefined) {
          const [day, month, year] = dateOfBirth.split('-');
          profileDataToUpdate.dateOfBirth = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
        }
        if (gender !== undefined) profileDataToUpdate.gender = gender;

        await tx.customerProfile.upsert({
          where: { userId },
          create: {
            userId,
            ...profileDataToUpdate,
          },
          update: profileDataToUpdate,
        });
      }

      return updatedUser;
    });
  }

  async getMe(userId: bigint): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
      },
    });
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}
