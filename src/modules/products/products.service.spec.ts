import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsService],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  //! Should exist
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  //! Find All
  it('should return all products', () => {
    const result = service.findAll();

    expect(result).toHaveLength(2);

    expect(result[0].name).toBe('Laptop');
  });

  //! Find One
  it('should return one product', () => {
    const result = service.findOne(1);

    expect(result?.id).toBe(1);

    expect(result?.name).toBe('Laptop');
  });

  //! Create One
  it('should create product', () => {
    const dto = {
      id: 3,
      name: 'Keyboard',
      price: 100,
    };

    const result = service.create(dto);

    expect(result).toEqual(dto);

    expect(service.findAll()).toHaveLength(3);
  });

  //! Update One
  it('should update product', () => {
    const result = service.update(1, {
      name: 'Gaming Laptop',
    });

    expect(result?.name).toBe('Gaming Laptop');
  });

  //! Delete
  it('should remove product', () => {
    expect(service.remove(1)).toBe(true);

    expect(service.findAll()).toHaveLength(1);
  });
});
