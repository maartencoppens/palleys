import { zipSync, strToU8 } from "fflate";
import { describe, expect, it } from "vitest";
import { describeModelMeta, imageSize, objStats, readModelMeta } from "./model-meta";

const OBJ = ["mtllib model.mtl", "v 0 0 0", "v 10 0 0", "v 10 20 0", "v 0 20 5.5", "f 1 2 3", "f 1/1/1 2/2/2 3/3/3 4/4/4", ""].join("\n");

// A 1×1 PNG header is enough: only IHDR is read.
function png(width: number, height: number) {
  const bytes = new Uint8Array(33);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

describe("model meta", () => {
  it("counts triangles (a quad is two) and measures the bounding box", () => {
    expect(objStats(strToU8(OBJ))).toEqual({ vertices: 4, triangles: 3, dimensions: [10, 20, 5.5] });
  });

  it("reads PNG and JPEG sizes from their headers", () => {
    expect(imageSize(png(2048, 1024))).toEqual({ width: 2048, height: 1024, format: "png" });
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0x03, 0x00, 0x04, 0x00, 3, 0, 0, 0]);
    expect(imageSize(jpeg)).toEqual({ width: 1024, height: 768, format: "jpg" });
  });

  it("reads a print zip and describes it", () => {
    const zip = zipSync({ "model.obj": strToU8(OBJ), "model.mtl": strToU8("newmtl a\nmap_Kd tex.png\n"), "tex.png": png(512, 512), "__MACOSX/._x.png": png(1, 1) });
    const meta = readModelMeta(zip);
    expect(meta).toMatchObject({ triangles: 3, vertices: 4, texture: { width: 512, height: 512, format: "png" } });
    expect(describeModelMeta(meta).dimensions).toBe("10 × 20 × 5,5 eenheden");
  });
});
