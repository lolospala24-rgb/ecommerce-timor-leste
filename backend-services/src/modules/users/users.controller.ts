// placeholder for src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Role } from '@prisma/client';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.ADMIN)
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    return { message: 'User created successfully', data: user };
  }

  @Get()
  @Roles(Role.ADMIN)
  async findAll(@Query() filterDto: UserFilterDto) {
    const result = await this.usersService.findAll(filterDto);
    return result;
  }

  @Get('profile')
  async getProfile(@CurrentUser('id') userId: number) {
    const user = await this.usersService.findOne(userId);
    return { data: user };
  }

  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(userId, updateUserDto);
    return { message: 'Profile updated successfully', data: user };
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  async getStats() {
    const stats = await this.usersService.getStats();
    return { data: stats };
  }

  @Get(':id')
  @Roles(Role.ADMIN)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    return { data: user };
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    const user = await this.usersService.update(id, updateUserDto);
    return { message: 'User updated successfully', data: user };
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.usersService.remove(id);
  }

  @Patch(':id/block')
  @Roles(Role.ADMIN)
  async blockUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.blockUser(id);
    return { message: 'User blocked successfully', data: user };
  }

  @Patch(':id/unblock')
  @Roles(Role.ADMIN)
  async unblockUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.unblockUser(id);
    return { message: 'User unblocked successfully', data: user };
  }

  @Post(':id/role')
  @Roles(Role.ADMIN)
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: Role,
  ) {
    const user = await this.usersService.changeRole(id, role);
    return { message: 'User role updated successfully', data: user };
  }
}