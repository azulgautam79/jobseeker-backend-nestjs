import 'reflect-metadata';
import { Roles, ROLES_KEY } from './roles.decorator';
import { Role } from '../enums/role';

describe('Roles Decorator', () => {
  it('should set roles metadata', () => {
    class TestController {
      @Roles(Role.JOBSEEKER, Role.EMPLOYER)
      getUsers() {}
    }

    const metadata = Reflect.getMetadata(
      ROLES_KEY,
      TestController.prototype.getUsers,
    );

    expect(metadata).toEqual([Role.JOBSEEKER, Role.EMPLOYER]);
  });
});
