import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';

// D-04: `images` previously only had @IsArray(), so any array survived —
// including one containing objects, numbers, null, or nested arrays, which
// then flowed straight into Product.images (and, on create, ended up as
// the `thumbnail`). This only checks the `images` property's own errors,
// not the DTO's other required fields, so each case stays isolated to the
// thing it's actually testing.
describe('CreateProductDto / UpdateProductDto — images array validation (D-04)', () => {
  const imagesErrors = async (dtoClass: any, images: unknown) => {
    const dto = plainToInstance(dtoClass, { images }) as object;
    const errors = await validate(dto, { skipMissingProperties: true });
    return errors.filter((e) => e.property === 'images');
  };

  for (const [label, DtoClass] of [
    ['CreateProductDto', CreateProductDto],
    ['UpdateProductDto', UpdateProductDto],
  ] as const) {
    describe(label, () => {
      it('accepts a plain array of Cloudinary-style URL strings', async () => {
        const errors = await imagesErrors(DtoClass, [
          'https://res.cloudinary.com/demo/image/upload/v1/a.jpg',
          'https://res.cloudinary.com/demo/image/upload/v1/b.jpg',
        ]);
        expect(errors).toHaveLength(0);
      });

      it('accepts omission (images stays optional)', async () => {
        const errors = await imagesErrors(DtoClass, undefined);
        expect(errors).toHaveLength(0);
      });

      it('rejects an array containing a plain object', async () => {
        const errors = await imagesErrors(DtoClass, ['https://x/a.jpg', { url: 'https://x/b.jpg' }]);
        expect(errors.length).toBeGreaterThan(0);
      });

      it('rejects an array containing a number', async () => {
        const errors = await imagesErrors(DtoClass, ['https://x/a.jpg', 12345]);
        expect(errors.length).toBeGreaterThan(0);
      });

      it('rejects an array containing null', async () => {
        const errors = await imagesErrors(DtoClass, ['https://x/a.jpg', null]);
        expect(errors.length).toBeGreaterThan(0);
      });

      it('rejects an array containing a nested array', async () => {
        const errors = await imagesErrors(DtoClass, ['https://x/a.jpg', ['https://x/nested.jpg']]);
        expect(errors.length).toBeGreaterThan(0);
      });

      it('still rejects a non-array value (pre-existing @IsArray behavior, unchanged)', async () => {
        const errors = await imagesErrors(DtoClass, 'not-an-array');
        expect(errors.length).toBeGreaterThan(0);
      });
    });
  }
});
