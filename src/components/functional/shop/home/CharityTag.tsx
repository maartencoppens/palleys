import Image from "next/image";

/*
 * Rays around the "50%" tag, from Figma (charity-section → Group 1). Each ray is the same pill shape,
 * centred in a box at `x`/`y` and rotated by `angle`. The whole group is 550×159 px.
 */
const rays = [
  { x: 13.15, y: 0, width: 50.022, height: 44.323, angle: 37.41 },
  { x: 0, y: 66.93, width: 49.226, height: 19.277, angle: -1.03 },
  { x: 12.47, y: 103.75, width: 51.497, height: 40.589, angle: -30.35 },
  { x: 486.6, y: 113.78, width: 49.702, height: 44.881, angle: -141.42 },
  { x: 501.64, y: 72.84, width: 48.949, height: 18.521, angle: -179.86 },
  { x: 487.65, y: 14.4, width: 51.668, height: 39.905, angle: 150.82 },
];

export default function CharityTag() {
  return (
    <div data-animate="rays" className="relative h-[158.66px] w-[550.59px]">
      {rays.map((ray) => (
        <div
          key={`${ray.x}-${ray.y}`}
          data-ray
          className="absolute grid place-items-center"
          style={{ left: ray.x, top: ray.y, width: ray.width, height: ray.height }}
          aria-hidden
        >
          <Image
            className="max-w-none"
            style={{ rotate: `${ray.angle}deg` }}
            src="/images/charity/ray.svg"
            width={48.903}
            height={18.399}
            alt=""
          />
        </div>
      ))}

      <div className="absolute top-[37.12px] left-[108.59px] flex h-[91px] items-center">
        <Image
          className="absolute top-[-35px] left-[-41px] max-w-none"
          src="/images/charity/tag-blob.svg"
          width={410}
          height={164}
          alt=""
          aria-hidden
        />
        <p className="relative flex items-center gap-[41px] font-display leading-[normal] font-medium whitespace-nowrap text-medium-green">
          <span className="text-[64px]">50%</span>
          <span className="flex flex-col gap-[5px] text-2xl">
            <span>Van onze winst</span>
            <span>Voor de dieren</span>
          </span>
        </p>
      </div>
    </div>
  );
}
