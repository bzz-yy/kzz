import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import {
  buildHandoffDocument,
  discoverHtmlFiles,
  makeOutputName,
  normalizeColorTokens
} from "../src/build-handoff.mjs";

describe("handoff generator", () => {
  it("discovers source html files without including generated handoff pages", async () => {
    const fixtureRoot = await mkdtemp(path.join(tmpdir(), "handoff-fixture-"));
    await mkdir(path.join(fixtureRoot, "handoff"));
    await writeFile(path.join(fixtureRoot, "fund.html"), "<!doctype html><title>Fund</title>");
    await writeFile(path.join(fixtureRoot, "portfolio.html"), "<!doctype html><title>Portfolio</title>");
    await writeFile(path.join(fixtureRoot, "fund-handoff.html"), "<!doctype html><title>Generated</title>");

    const files = await discoverHtmlFiles(fixtureRoot);
    const names = files.map((file) => file.name);

    assert.deepEqual(names, ["fund.html", "portfolio.html"]);
    await rm(fixtureRoot, { recursive: true, force: true });
  });

  it("creates readable output names for source pages", () => {
    assert.equal(makeOutputName("1-混合股票债券基金详情.html"), "1-混合股票债券基金详情-handoff.html");
  });

  it("embeds the source html and inspector runtime in a standalone document", () => {
    const result = buildHandoffDocument({
      title: "基金详情",
      fileName: "fund.html",
      sourceHtml: "<!doctype html><html><body><h1>基金详情</h1></body></html>"
    });

    assert.match(result, /HTML Design Handoff/);
    assert.match(result, /<iframe/);
    assert.match(result, /data-source-html=/);
    assert.match(result, /function selectElement/);
    assert.match(result, /Specs JSON/);
    assert.match(result, /基础标注/);
    assert.match(result, /高级信息/);
    assert.match(result, /function resolvedLineHeight/);
    assert.match(result, /function formatMeasure/);
    assert.match(result, /交互模式/);
    assert.match(result, /基金详情/);
  });

  it("splits shorthand css color values into individual tokens", () => {
    assert.deepEqual(normalizeColorTokens("rgb(0, 0, 0) rgb(255, 255, 255)"), [
      "rgb(0, 0, 0)",
      "rgb(255, 255, 255)"
    ]);
  });
});
