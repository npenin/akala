import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseCronSyntax, parseCronPart, getTarget, getTargets, cronRegex, cronPartRegex } from '../index.js';

describe('Cron Syntax Parsing', () =>
{
    describe('Special Cron Expressions', () =>
    {
        it('should parse @hourly correctly', () =>
        {
            const result = parseCronSyntax('@hourly');
            assert.deepStrictEqual(result, [{ minutes: 0 }]);
        });

        it('should parse @daily correctly', () =>
        {
            const result = parseCronSyntax('@daily');
            assert.deepStrictEqual(result, [{ minutes: 0, hour: 0 }]);
        });

        it('should parse @weekly correctly', () =>
        {
            const result = parseCronSyntax('@weekly');
            assert.deepStrictEqual(result, [{ minutes: 0, hour: 0, day: [0] }]);
        });

        it('should parse @monthly correctly', () =>
        {
            const result = parseCronSyntax('@monthly');
            assert.deepStrictEqual(result, [{ minutes: 0, hour: 0, date: 1 }]);
        });

        it('should parse @yearly correctly', () =>
        {
            const result = parseCronSyntax('@yearly');
            assert.deepStrictEqual(result, [{ minutes: 0, hour: 0, date: 1, month: 1 }]);
        });

        it('should parse @annually correctly', () =>
        {
            const result = parseCronSyntax('@annually');
            assert.deepStrictEqual(result, [{ minutes: 0, hour: 0, date: 1, month: 1 }]);
        });
    });

    describe('Standard Cron Expressions', () =>
    {
        it('should parse simple cron expression', () =>
        {
            const result = parseCronSyntax('0 0 * * *');
            assert.deepStrictEqual(result, [{
                minutes: 0,
                hour: 0,
                day: undefined,
                date: undefined,
                month: undefined,
                lat: null,
                lng: null,
                tz: null
            }]);
        });

        it('should parse cron with specific minutes and hours', () =>
        {
            const result = parseCronSyntax('30 2 * * *');
            assert.deepStrictEqual(result, [{
                minutes: 30,
                hour: 2,
                day: undefined,
                date: undefined,
                month: undefined,
                lat: null,
                lng: null,
                tz: null
            }]);
        });

        it('should parse cron with day of week', () =>
        {
            const result = parseCronSyntax('0 0 * * 1');
            assert.deepStrictEqual(result, [{
                minutes: 0,
                hour: 0,
                day: [1],
                date: undefined,
                month: undefined,
                lat: null,
                lng: null,
                tz: null
            }]);
        });

        it('should parse cron with multiple days of week', () =>
        {
            const result = parseCronSyntax('0 0 * * 1,3,5');
            assert.deepStrictEqual(result, [{
                minutes: 0,
                hour: 0,
                day: [1, 3, 5],
                date: undefined,
                month: undefined,
                lat: null,
                lng: null,
                tz: null
            }]);
        });

        it('should parse cron with day ranges', () =>
        {
            const result = parseCronSyntax('0 0 * * 1-5');
            assert.deepStrictEqual(result, [{
                minutes: 0,
                hour: 0,
                day: [1, 2, 3, 4, 5],
                date: undefined,
                month: undefined,
                lat: null,
                lng: null,
                tz: null
            }]);
        });

        it('should parse cron with steps', () =>
        {
            const result = parseCronSyntax('*/15 */2 * * *');
            assert.deepStrictEqual(result, [0, 15, 30, 45].flatMap(minute =>
                [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(hour =>
                ({
                    minutes: minute,
                    hour: hour,
                    day: undefined,
                    date: undefined,
                    month: undefined,
                    lat: null,
                    lng: null,
                    tz: null
                })))
            );
        });

        it('should parse complex cron expression', () =>
        {
            const result = parseCronSyntax('0 9-17/2 * * 1-5');
            assert.deepStrictEqual(result,
                [9, 11, 13, 15, 17].map(hour =>
                ({
                    minutes: 0,
                    hour,
                    day: [1, 2, 3, 4, 5],
                    date: undefined,
                    month: undefined,
                    lat: null,
                    lng: null,
                    tz: null
                }))
            );
        });
    });

    describe('Cron Part Parsing', () =>
    {
        it('should parse wildcard', () =>
        {
            const result = parseCronPart('*', 60);
            assert.strictEqual(result, undefined);
        });

        it('should parse specific value', () =>
        {
            const result = parseCronPart('5', 60);
            assert.deepStrictEqual(result, [5]);
        });

        it('should parse range', () =>
        {
            const result = parseCronPart('1-5', 60);
            assert.deepStrictEqual(result, [1, 2, 3, 4, 5]);
        });

        it('should parse list', () =>
        {
            const result = parseCronPart('1,3,5', 60);
            assert.deepStrictEqual(result, [1, 3, 5]);
        });

        it('should parse step with wildcard', () =>
        {
            const result = parseCronPart('*/10', 60);
            assert.deepStrictEqual(result, [0, 10, 20, 30, 40, 50]);
        });

        it('should parse step with range', () =>
        {
            const result = parseCronPart('0-30/10', 60);
            assert.deepStrictEqual(result, [0, 10, 20, 30]);
        });

        it('should handle invalid part', () =>
        {
            assert.throws(() => parseCronPart('invalid', 60), /invalid parsing invalid/);
        });
    });

    describe('Regex Patterns', () =>
    {
        it('should match valid cron expression', () =>
        {
            const validExpressions = [
                '0 0 * * *',
                '30 2 * * 1',
                '*/15 9-17 * * 1-5',
                '0 0 1 * *',
                '0 0 * 1 *'
            ];

            validExpressions.forEach(expr =>
            {
                assert.strictEqual(cronRegex.test(expr), true);
            });
        });

        it('should not match invalid cron expression', () =>
        {
            const invalidExpressions = [
                '0 0',           // Too few parts
                '0 0 * * * *',    // Too many parts
                'abc * * * *',    // Invalid characters
                '0 0 * * * extra' // Extra content
            ];

            invalidExpressions.forEach(expr =>
            {
                assert.strictEqual(cronRegex.test(expr), false);
            });
        });

        it('should match cron part patterns', () =>
        {
            const validParts = ['*', '5', '1-10', '*/5', '0-30/10'];
            const invalidParts = ['abc', '1-', '-5', '*/', '/5'];

            validParts.forEach(part =>
            {
                assert.strictEqual(cronPartRegex.test(part), true, new Error(`${part} was supposed to be valid`));
            });

            invalidParts.forEach(part =>
            {
                assert.strictEqual(cronPartRegex.test(part), false, new Error(`${part} was supposed to be invalid`));
            });
        });
    });

    describe('Date Target Calculation', () =>
    {
        const fixedDate = new Date('2023-08-15T10:30:00Z'); // Tuesday

        it('should calculate next hourly target', () =>
        {
            const target = getTarget({ minutes: 0 }, fixedDate);
            assert.strictEqual(target.getUTCMinutes(), 0);
            assert.strictEqual(target.getUTCHours(), 11); // Next hour
        });

        it('should calculate next daily target', () =>
        {
            const target = getTarget({ minutes: 0, hour: 0 }, fixedDate);
            assert.strictEqual(target.getMinutes(), 0);
            assert.strictEqual(target.getHours(), 0);
            assert.strictEqual(target.getUTCDate(), 16); // Next day
        });

        it('should calculate next weekly target', () =>
        {
            const target = getTarget({ minutes: 0, hour: 0, day: [0] }, fixedDate);
            assert.strictEqual(target.getMinutes(), 0);
            assert.strictEqual(target.getHours(), 0);
            assert.strictEqual(target.getDay(), 0); // Sunday
        });

        it('should calculate monthly target', () =>
        {
            const target = getTarget({ minutes: 0, hour: 0, date: 1 }, fixedDate);
            assert.strictEqual(target.getDate(), 1);
            assert.strictEqual(target.getMonth(), 8); // Next month (September)
        });

        it('should handle day of week constraints', () =>
        {
            const target = getTarget({ minutes: 0, hour: 0, day: [3] }, fixedDate); // Wednesday
            assert.strictEqual(target.getDay(), 3);
        });
    });

    describe('Multiple Targets', () =>
    {
        it('should return sorted targets', () =>
        {
            const requests = [
                { minutes: 0, hour: 0, day: [1] }, // Monday
                { minutes: 0, hour: 0, day: [3] }  // Wednesday
            ];
            const targets = getTargets(requests, new Date('2023-08-15T10:30:00Z')); // Tuesday
            assert.strictEqual(targets.length, 2);
            assert(targets[0].target.valueOf() < targets[1].target.valueOf());
        });
    });

    describe('Edge Cases', () =>
    {
        it('should handle last day of month', () =>
        {
            const result = parseCronSyntax('0 0 L * *');
            assert.deepStrictEqual(result, [{
                minutes: 0,
                hour: 0,
                date: 'last',
                day: undefined,
                month: undefined,
                lat: null,
                lng: null,
                tz: null
            }]);
        });

        it('should handle month ranges', () =>
        {
            const result = parseCronSyntax('0 0 1 6-8 *');
            assert.deepStrictEqual(result, [6, 7, 8].map(month => ({
                minutes: 0,
                hour: 0,
                date: 1,
                month: month,
                day: undefined,
                lat: null,
                lng: null,
                tz: null
            })));
        });

        it('should handle day of month ranges', () =>
        {
            const result = parseCronSyntax('0 0 1-7 * *');
            assert.deepStrictEqual(result, [1, 2, 3, 4, 5, 6, 7].map(date => ({
                minutes: 0,
                hour: 0,
                date,
                day: undefined,
                month: undefined,
                lat: null,
                lng: null,
                tz: null
            })));
        });
    });

    describe('Error Handling', () =>
    {
        it('should throw on invalid cron expression', () =>
        {
            assert.throws(() => parseCronSyntax('invalid'));
        });

        it('should throw on malformed special expression', () =>
        {
            assert.throws(() => parseCronSyntax('@invalid'));
        });

        it('should handle out of range values', () =>
        {
            assert.throws(() => parseCronPart('60', 60)); // Minutes can't be 60
            assert.throws(() => parseCronPart('24', 24)); // Hours can't be 24
        });
    });

    describe('Complex Scenarios', () =>
    {
        it('should handle business hours cron', () =>
        {
            const result = parseCronSyntax('0 9-17 * * 1-5');
            assert.deepStrictEqual(result, [9, 10, 11, 12, 13, 14, 15, 16, 17].map(hour =>
            ({
                minutes: 0,
                hour,
                day: [1, 2, 3, 4, 5],
                date: undefined,
                month: undefined,
                lat: null,
                lng: null,
                tz: null
            })));
        });

        it('should handle quarterly reports', () =>
        {
            const result = parseCronSyntax('0 0 1 1,4,7,10 *');
            assert.deepStrictEqual(result, [1, 4, 7, 10].map(month => ({
                minutes: 0,
                hour: 0,
                date: 1,
                month,
                day: undefined,
                lat: null,
                lng: null,
                tz: null
            })));
        });

        it('should handle weekend maintenance', () =>
        {
            const result = parseCronSyntax('0 2 * * 0,6');
            assert.deepStrictEqual(result, [{
                minutes: 0,
                hour: 2,
                day: [0, 6],
                date: undefined,
                month: undefined,
                lat: null,
                lng: null,
                tz: null
            }]);
        });

        it('should handle midnight with steps', () =>
        {
            const result = parseCronSyntax('0 */6 * * *');
            assert.deepStrictEqual(result, [{
                minutes: 0,
                hour: 0,
                month: undefined,
                day: undefined,
                date: undefined,
                lat: null,
                lng: null,
                tz: null
            }, {
                minutes: 0,
                hour: 6,
                month: undefined,
                day: undefined,
                date: undefined,
                lat: null,
                lng: null,
                tz: null
            }, {
                minutes: 0,
                hour: 12,
                month: undefined,
                day: undefined,
                date: undefined,
                lat: null,
                lng: null,
                tz: null
            }, {
                minutes: 0,
                hour: 18,
                month: undefined,
                day: undefined,
                date: undefined,
                lat: null,
                lng: null,
                tz: null
            }]);
        });
    });
});
