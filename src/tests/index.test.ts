import { test, expect, describe } from '@jest/globals';
import { Client, Pointer, Container } from '../index';
import path from 'path';
import Schema from '../structures/Schema';
import { TestSchema, UserSchema } from './TestSchema';
import { uid } from 'uid';
import Entity from 'structures/Entity';

describe("Test database", () =>
{
	test("Test all functions", async () =>
	{
		const OpenDB = new Client({ Path: 'src/..', Buffer: 1024 });// Important! do not put / at the end of the path

		expect(await OpenDB.InstanceDatabase("Test"));

		expect(await OpenDB.CreatePointer("TestPointer")).toBe(undefined);
		const pointer = OpenDB.GetPointer("TestPointer") as Pointer;

		UserSchema.DefineTable();

		for (let i = 0; i < 5000; i++) {
			UserSchema.id = uid(18);

			const names = [ "Printf", "Nacho", "Simon", "Leerot" ];

			const random = names[Math.floor(Math.random() * names.length)];

			const entity = await OpenDB.Add("TestPointer", UserSchema, ["auto_increment", random]) as Entity;
		}
		
		const table = OpenDB.Find("TestPointer", (x) => x?.name === "username" && x.value === "Printf");

		console.log(table);

		const filter = OpenDB.Filter("TestPointer", (x) => x?.name === "username");

		console.log(filter);
	}, 500000);
});
