import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    updateProfie: jest.fn(),
    deleteResume: jest.fn(),
    getPublicProfile: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  //! Should exist
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  //! Find All
  it('should return all users', async () => {
    const users = [
      { id: '1', name: 'John' },
      { id: '2', name: 'Jane' },
    ];

    mockUsersService.findAll.mockResolvedValue(users);

    const result = await controller.findAll();

    expect(service.findAll).toHaveBeenCalledTimes(1);

    expect(result).toEqual(users);
  });

  //! Find One
  it('should return one user', async () => {
    const user = {
      id: '1',
      name: 'John',
    };

    mockUsersService.findOne.mockResolvedValue(user);

    const result = await controller.findOne('1');

    expect(service.findOne).toHaveBeenCalledWith('1');

    expect(result).toEqual(user);
  });

  //! Update Profile
  it('should update user profile', async () => {
    const dto = {
      name: 'Updated Name',
    };

    const updatedUser = {
      _id: '1',
      name: 'Updated Name',
    };

    mockUsersService.updateProfie.mockResolvedValue(updatedUser);

    const result = await controller.updateProfile('1', dto as any);

    expect(service.updateProfie).toHaveBeenCalledWith('1', dto);

    expect(result).toEqual(updatedUser);
  });

  //! Remove Resume
  it('should delete resume', async () => {
    const dto = {
      resume: 'resume.pdf',
    };

    const response = {
      success: true,
    };

    mockUsersService.deleteResume.mockResolvedValue(response);

    const result = await controller.removeResume('1', dto as any);

    expect(service.deleteResume).toHaveBeenCalledWith('1', dto);

    expect(result).toEqual(response);
  });

  //! Get Public Profile()
  it('should return public profile', async () => {
    const profile = {
      name: 'John',
      role: 'JOBSEEKER',
    };

    mockUsersService.getPublicProfile.mockResolvedValue(profile);

    const result = await controller.getPublicProfile('1');

    expect(service.getPublicProfile).toHaveBeenCalledWith('1');

    expect(result).toEqual(profile);
  });
});
