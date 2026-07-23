import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  private products = [
    { id: 1, name: 'Laptop', price: 1000 },
    { id: 2, name: 'Phone', price: 500 },
  ];

  findAll() {
    return this.products;
  }

  findOne(id: number) {
    return this.products.find((p) => p.id === id);
  }

  create(product: any) {
    this.products.push(product);
    return product;
  }

  update(id: number, body: any) {
    const product = this.findOne(id);

    if (!product) return null;

    Object.assign(product, body);

    return product;
  }

  remove(id: number) {
    const index = this.products.findIndex((p) => p.id === id);

    if (index === -1) return false;

    this.products.splice(index, 1);

    return true;
  }
}
