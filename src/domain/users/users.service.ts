import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CacheService } from 'src/infrastructure/cache';
import { CreateUserDto, UpdateUserDto } from './dto';
import { User } from './entities/users.entity';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    private readonly cacheService: CacheService,
    readonly usersRepository: UsersRepository,
  ) { }

  async findAll(): Promise<User[]> {
    return this.usersRepository.findAll();
  }

  async findById(id: number): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('USR-404');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findByEmail(email);
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    // Verifica se o email já existe
    const existingUser = await this.usersRepository.findByEmail(
      createUserDto.email,
    );
    if (existingUser) {
      throw new ConflictException('USR-409-EMAIL');
    }

    // Hash da password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const userData: Partial<User> = {
      ...createUserDto,
      password: hashedPassword,
      active: createUserDto.active ?? true,
    };

    const newUser = await this.usersRepository.create(userData);
    await this.cacheService.cache.del('usuarios');
    return newUser;
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
  ): Promise<User> {
    await this.existsOrThrow(id);

    // Se estiver atualizando o email, verifica se já existe outro usuário com esse email
    if (updateUserDto.email) {
      const existingUser = await this.usersRepository.findByEmail(
        updateUserDto.email,
      );
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('USR-409-EMAIL');
      }
    }

    const userData: Partial<User> = { ...updateUserDto };

    // Hash da password se foi fornecida
    if (updateUserDto.password) {
      userData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.usersRepository.update(
      id,
      userData,
    );
    await this.cacheService.cache.del('usuarios');
    return updatedUser!;
  }

  async delete(id: number): Promise<boolean> {
    await this.existsOrThrow(id);
    const deleted = await this.usersRepository.delete(id);
    await this.cacheService.cache.del('usuarios');
    return deleted;
  }

  async existsOrThrow(id: number): Promise<boolean> {
    const usuario = await this.usersRepository.findById(id);
    if (!usuario) {
      throw new NotFoundException('USR-404');
    }
    return true;
  }
}
