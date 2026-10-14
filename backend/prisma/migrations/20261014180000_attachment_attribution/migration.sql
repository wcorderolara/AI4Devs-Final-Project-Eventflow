-- Crédito opcional de una imagen adjunta (autor, licencia y fuente). Lo usan las fotos de licencia
-- libre del seed demo para mostrar la atribución que exige la licencia (CC BY / CC BY-SA) junto a
-- la foto en la galería pública. Aditivo y nullable: las subidas de los proveedores no cambian.
ALTER TABLE "attachments" ADD COLUMN "attribution" JSONB;
