import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(ProductsService.name);

  onModuleInit() {
    this.$connect();
    this.logger.log('Database connected');
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    });
  }

  async findAll({ limit, page }: PaginationDto) {
    const total = await this.product.count({
      where: {
        available: true,
      },
    });
    const lastPage = Math.ceil(total / limit);
    const data = await this.product.findMany({
      where: {
        available: true,
      },
      take: limit,
      skip: (page - 1) * limit,
    });

    return {
      total,
      data,
      lastPage,
    };
  }

  async findOne(id: number) {
    const product = await this.product.findFirst({
      where: {
        id,
        available: true,
      },
    });
    if (!product)
      throw new RpcException({
        message: `Product with id: ${id} not found`,
        status: HttpStatus.BAD_REQUEST,
      });
    return product;
  }

  async update({ id, ...updateProductDto }: UpdateProductDto) {
    await this.findOne(id);
    return this.product.update({
      where: {
        id,
      },
      data: updateProductDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    const product = await this.product.update({
      where: { id },
      data: {
        available: false,
      },
    });
    return product;
  }

  async validateProducts(ids: number[]) {
    ids = Array.from(new Set(ids));

    const products = await this.product.findMany({
      where: {
        id: {
          in: ids,
        },
      },
    });

    if (products.length !== ids.length)
      throw new RpcException({
        message: 'Some products were not found',
        status: HttpStatus.BAD_REQUEST,
      });

    return products;
  }
}
