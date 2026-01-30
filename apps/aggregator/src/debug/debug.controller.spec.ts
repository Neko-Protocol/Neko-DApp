import { Test, TestingModule } from "@nestjs/testing";
import { DebugController, setLastPrice } from "./debug.controller";

describe("DebugController", () => {
  let controller: DebugController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DebugController],
    }).compile();

    controller = module.get<DebugController>(DebugController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("getPrices", () => {
    it("returns an object", () => {
      expect(controller.getPrices()).toEqual(expect.any(Object));
    });

    it("returns last prices when set via setLastPrice", () => {
      setLastPrice("NVDA", 150_00000000, 1_000_000_000);
      setLastPrice("TSLA", 200_00000000, 1_000_000_001);
      const prices = controller.getPrices();
      expect(prices.NVDA).toEqual({ price: 150_00000000, timestamp: 1_000_000_000 });
      expect(prices.TSLA).toEqual({ price: 200_00000000, timestamp: 1_000_000_001 });
    });
  });
});
