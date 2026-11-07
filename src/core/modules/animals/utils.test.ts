import { describe, expect, it } from "vitest";
import { DEFAULT_ANIMALS } from "@/data/animals";
import { animalLabels, findAnimalByCode, newAnimal } from "./utils";

describe("animals", () => {
  it("makes a value and SKU code from the Dutch name", () => {
    expect(newAnimal({ nl: "Papegaai", en: "Parrot" }, DEFAULT_ANIMALS)).toEqual({
      value: "papegaai",
      code: "PAPEGAAI",
      labels: { nl: "Papegaai", en: "Parrot" },
    });
    expect(newAnimal({ nl: "Baardagame ", en: "Bearded dragon" }, DEFAULT_ANIMALS)?.code).toBe("BAARDAGAME");
    expect(newAnimal({ nl: "Goudvis (oranje)", en: "Goldfish" }, DEFAULT_ANIMALS)).toMatchObject({ value: "goudvis-oranje", code: "GOUDVISORANJE" });
  });

  it("numbers a name that is taken, and refuses one without letters", () => {
    expect(newAnimal({ nl: "Hond", en: "Dog" }, [...DEFAULT_ANIMALS, { value: "hond", code: "HONDJE", labels: { nl: "x", en: "x" } }])?.value).toBe("hond-2");
    expect(newAnimal({ nl: "Kat", en: "Cat" }, DEFAULT_ANIMALS)?.code).toBe("KAT2");
    expect(newAnimal({ nl: "!!", en: "x" }, DEFAULT_ANIMALS)).toBeNull();
  });

  it("looks animals up by value and code", () => {
    expect(animalLabels(DEFAULT_ANIMALS, "guinea-pig")).toEqual({ nl: "Cavia", en: "Guinea pig" });
    expect(animalLabels(DEFAULT_ANIMALS, "dinosaur")).toBeNull();
    expect(findAnimalByCode(DEFAULT_ANIMALS, "SLANG")?.value).toBe("snake");
  });
});
