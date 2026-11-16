import { describe, expect, it } from "vitest";
import { strToU8, zipSync, type Zippable } from "fflate";
import { InvalidModelZipError, readModelZip } from "./model-zip";

const zip = (files: Record<string, string>) =>
  zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)])) as Zippable);

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("readModelZip", () => {
  it("reads an OBJ, its MTL and the texture the MTL points to, from any folder", () => {
    const result = readModelZip(
      zip({
        "export/model.obj": "mtllib model.mtl\nv 0 0 0",
        "export/model.mtl": "newmtl m\nmap_Kd textures/skin.jpg",
        "export/textures/skin.jpg": "jpg",
        "export/textures/normal.png": "normal",
        "__MACOSX/export/._model.obj": "junk",
      }),
    );
    expect(text(result.obj)).toContain("v 0 0 0");
    expect(text(result.mtl)).toContain("newmtl m");
    expect(result.texture).toEqual({ bytes: strToU8("jpg"), extension: "jpg" });
    expect(result.glb).toBeNull();
  });

  it("takes the only image when the MTL names none, and a GLB for the viewer", () => {
    const result = readModelZip(zip({ "a.obj": "v 0 0 0", "a.mtl": "newmtl m", "texture.png": "png", "a.glb": "glb" }));
    expect(result.texture.extension).toBe("png");
    expect(text(result.glb!)).toBe("glb");
  });

  it("picks the MTL the OBJ names when there are two", () => {
    const result = readModelZip(zip({ "a.obj": "mtllib b.mtl", "a.mtl": "newmtl a", "b.mtl": "newmtl b", "t.png": "png" }));
    expect(text(result.mtl)).toBe("newmtl b");
  });

  it.each([
    [{ "a.mtl": "x", "t.png": "x" }, "geen OBJ"],
    [{ "a.obj": "x", "t.png": "x" }, "geen MTL"],
    [{ "a.obj": "x", "a.mtl": "x" }, "geen textuur"],
    [{ "a.obj": "x", "b.obj": "x", "a.mtl": "x", "t.png": "x" }, "meer dan één OBJ"],
    [{ "a.obj": "x", "a.mtl": "x", "t.png": "x", "u.png": "x" }, "Welke afbeelding"],
  ])("refuses an incomplete or ambiguous zip (%#)", (files, message) => {
    expect(() => readModelZip(zip(files))).toThrow(InvalidModelZipError);
    expect(() => readModelZip(zip(files))).toThrow(message);
  });

  it("refuses something that isn't a zip", () => {
    expect(() => readModelZip(strToU8("not a zip"))).toThrow("geen geldige zip");
  });
});
