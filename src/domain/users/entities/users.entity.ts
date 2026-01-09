export class User {
  declare id: number;
  name!: string;
  email!: string;
  password!: string;
  cpf?: string;
  telephone?: string;
  active!: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}
