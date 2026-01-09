import { AdministrationModule } from "@/domain/administration/administration.module";
import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";

@Module({
  imports: [
    AdministrationModule,
    RouterModule.register([
      {
        path: 'admins',
        children: []
      }
    ])
  ],
  controllers: []
})
export class AdministrationHttpModule { }
