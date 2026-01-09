import { Injectable } from '@nestjs/common';
import { BaseRepository } from 'src/infrastructure/database/base-respository';
import { User } from './entities/users.entity';

@Injectable()
export class UsersRepository extends BaseRepository {
  async findAll(): Promise<User[]> {
    return this.db.from<User>('users').select('*');
  }

  async findById(id: number): Promise<User | null> {
    const user = await this.db.from<User>('users').where({ id }).first();
    return user || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.db.from<User>('users')
      .where({ email })
      .first();
    return user || null;
  }

  async create(userData: Partial<User>): Promise<User> {
    const [newUser] = await this.db.from<User>('users')
      .insert(userData)
      .returning('*');
    return newUser;
  }

  async update(
    id: number,
    userData: Partial<User>,
  ): Promise<User | null> {
    const [updatedUser] = await this.db.from<User>('users')
      .update(userData)
      .where({ id })
      .returning('*');
    return updatedUser || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.from<User>('users').where({ id }).del();
    return result > 0;
  }
}
