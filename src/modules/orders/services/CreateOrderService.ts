import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer does not exists');
    }

    const productsIds = products.map(product => {
      return { id: product.id };
    });

    const prods = await this.productsRepository.findAllById(productsIds);

    const productsUpdate: IUpdateProductsQuantityDTO[] = [];

    const orderProducts = prods.map(prod => {
      const product = products.find(findProduct => findProduct.id === prod.id);
      if (product?.quantity) {
        productsUpdate.push({ id: prod.id, quantity: product.quantity });
      }

      return {
        product_id: prod.id,
        price: prod.price,
        quantity: product?.quantity || 0,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    await this.productsRepository.updateQuantity(productsUpdate);

    return order;
  }
}

export default CreateOrderService;
