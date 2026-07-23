import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductsService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  //! Should exist
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  //! Find All
  it('should return all products', () => {
    mockService.findAll.mockReturnValue([
      {
        id: 1,
        name: 'Laptop',
      },
    ]);

    const result = controller.findAll();

    expect(mockService.findAll).toHaveBeenCalled();

    expect(result).toHaveLength(1);

    expect(result[0].name).toBe('Laptop');
  });

  //! Create Product
  it('should create product', async () => {
    mockService.create.mockReturnValue({
      id: 10,
      name: 'Mouse',
    });

    const dto = {
      id: 10,
      name: 'Mouse',
    };

    const result = await controller.create(dto);

    expect(mockService.create).toHaveBeenCalledWith(dto);

    expect(result.name).toBe('Mouse');
  });

  //! Update product
  it('should update product', () => {
    mockService.update.mockReturnValue({
      id: 1,
      name: 'Updated',
    });

    const result = controller.update(1, {
      name: 'Updated',
    });

    expect(mockService.update).toHaveBeenCalledWith(1, {
      name: 'Updated',
    });

    expect(result?.name).toBe('Updated');
  });

  //! Delete
  it('should remove product', () => {
    mockService.remove.mockReturnValue(true);

    const result = controller.remove(1);

    expect(mockService.remove).toHaveBeenCalledWith(1);

    expect(result).toBe(true);
  });
});
