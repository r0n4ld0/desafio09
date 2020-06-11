import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
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
      throw new AppError('The customer does not exist.');
    }

    const stockProducts = await this.productsRepository.findAllById(products);

    if (!stockProducts || stockProducts.length !== products.length) {
      throw new AppError('The product does not exist.');
    }

    const orderedProducts = stockProducts.map(product => {
      const validProduct = products.filter(p => p.id === product.id);

      if (!validProduct || validProduct[0].quantity > product.quantity) {
        throw new AppError('The product does not have quantity on stock.');
      }

      return {
        product_id: product.id,
        price: product.price,
        quantity: validProduct[0].quantity,
      };
    });

    const order = this.ordersRepository.create({
      customer,
      products: orderedProducts,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
