package postgres

import (
	"encoding/csv"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/gtime"

	"regexp"
	"strings"
	"time"

	"github.com/grafana/grafana/pkg/infra/log"
	"github.com/grafana/grafana/pkg/tsdb/sqleng"
)

var macrosLogger = log.New("macros")

const rsIdentifier = `([_a-zA-Z0-9]+)`
const sExpr = `\$` + rsIdentifier + `\(([^\)]*)\)`

type postgresMacroEngine struct {
	*sqleng.SQLMacroEngineBase
	timescaledb bool
}

func newPostgresMacroEngine(timescaledb bool) sqleng.SQLMacroEngine {
	return &postgresMacroEngine{
		SQLMacroEngineBase: sqleng.NewSQLMacroEngineBase(),
		timescaledb:        timescaledb,
	}
}

func (m *postgresMacroEngine) Interpolate(query *backend.DataQuery, timeRange backend.TimeRange, sql string) (string, error) {
	// TODO: Handle error
	rExp, _ := regexp.Compile(sExpr)
	var macroError error
	sql = m.ReplaceAllStringSubmatchFunc(rExp, sql, func(groups []string) string {
		// detect if $__timeGroup is supposed to add AS time for pre 5.3 compatibility
		// if there is a ',' directly after the macro call $__timeGroup is probably used
		// in the old way. Inside window function ORDER BY $__timeGroup will be followed
		// by ')'
		macroName := groups[1]
		if macroName == "__timeGroup" {
			if index := strings.Index(sql, groups[0]); index >= 0 {
				index += len(groups[0])
				// check for character after macro expression
				if len(sql) > index && sql[index] == ',' {
					macroName = "__timeGroupAlias"
				}
			}
		}

		params := groups[2]
		args, err := m.extractArgsFromParams(params)
		if err != nil && macroError == nil {
			macroError = err
			macrosLogger.Debug("macroError", "args", fmt.Sprintf("%v", macroError))
			macrosLogger.Debug("groups[2]", "args", fmt.Sprintf("%v", params))
			return "macro_error()"
		}

		res, err := m.evaluateMacro(timeRange, query, macroName, args)
		if err != nil && macroError == nil {
			macroError = err
			return "macro_error()"
		}
		return res
	})
	if macroError != nil {
		return "", macroError
	}
	return sql, nil
}

func (m *postgresMacroEngine) extractArgsFromParams(params string) ([]string, error) {
	if params == "" {
		return []string{""}, nil
	}
	r := csv.NewReader(strings.NewReader(params))
	r.LazyQuotes = true
	r.TrimLeadingSpace = true
	args, err := r.Read()
	if err != nil {
		return nil, err
	}
	for i, arg := range args {
		args[i] = strings.TrimSpace(arg)
	}
	return args, nil
}

//nolint:gocyclo
func (m *postgresMacroEngine) evaluateMacro(timeRange backend.TimeRange, query *backend.DataQuery, name string, args []string) (string, error) {
	macrosLogger.Debug("evaluating macros", "args", fmt.Sprintf("%v", args))
	switch name {
	case "__time":
		if len(args) == 0 {
			return "", fmt.Errorf("missing time column argument for macro %v", name)
		}
		return fmt.Sprintf("%s AS \"time\"", args[0]), nil
	case "__timeEpoch":
		if len(args) == 0 {
			return "", fmt.Errorf("missing time column argument for macro %v", name)
		}
		return fmt.Sprintf("extract(epoch from %s) as \"time\"", args[0]), nil
	case "__timeFilter":
		if len(args) == 0 {
			return "", fmt.Errorf("missing time column argument for macro %v", name)
		}
		return fmt.Sprintf("%s BETWEEN '%s' AND '%s'", args[0], timeRange.From.UTC().Format(time.RFC3339Nano), timeRange.To.UTC().Format(time.RFC3339Nano)), nil
	case "__timeFrom":
		return fmt.Sprintf("'%s'", timeRange.From.UTC().Format(time.RFC3339Nano)), nil
	case "__timeTo":
		return fmt.Sprintf("'%s'", timeRange.To.UTC().Format(time.RFC3339Nano)), nil
	case "__timeGroup":
		if len(args) < 2 {
			return "", fmt.Errorf("macro %v needs time column and interval and optional fill value", name)
		}
		interval, err := gtime.ParseInterval(strings.Trim(args[1], `'`))
		if err != nil {
			return "", fmt.Errorf("error parsing interval %v", args[1])
		}
		if len(args) == 3 {
			err := sqleng.SetupFillmode(query, interval, args[2])
			if err != nil {
				return "", err
			}
		}
		if m.timescaledb {
			return fmt.Sprintf("time_bucket('%.3fs',%s)", interval.Seconds(), args[0]), nil
		}
		return fmt.Sprintf(
			"floor(extract(epoch from %s)/%v)*%v", args[0],
			interval.Seconds(),
			interval.Seconds(),
		), nil
	case "__timeGroupAlias":
		tg, err := m.evaluateMacro(timeRange, query, "__timeGroup", args)
		if err == nil {
			return tg + " AS \"time\"", nil
		}
		return "", err
	case "__unixEpochFilter":
		if len(args) == 0 {
			return "", fmt.Errorf("missing time column argument for macro %v", name)
		}
		return fmt.Sprintf("%s >= %d AND %s <= %d", args[0], timeRange.From.UTC().Unix(), args[0], timeRange.To.UTC().Unix()), nil
	case "__unixEpochNanoFilter":
		if len(args) == 0 {
			return "", fmt.Errorf("missing time column argument for macro %v", name)
		}
		return fmt.Sprintf("%s >= %d AND %s <= %d", args[0], timeRange.From.UTC().UnixNano(), args[0], timeRange.To.UTC().UnixNano()), nil
	case "__unixEpochNanoFrom":
		return fmt.Sprintf("%d", timeRange.From.UTC().UnixNano()), nil
	case "__unixEpochNanoTo":
		return fmt.Sprintf("%d", timeRange.To.UTC().UnixNano()), nil
	case "__unixEpochGroup":
		if len(args) < 2 {
			return "", fmt.Errorf("macro %v needs time column and interval and optional fill value", name)
		}
		interval, err := gtime.ParseInterval(strings.Trim(args[1], `'`))
		if err != nil {
			return "", fmt.Errorf("error parsing interval %v", args[1])
		}
		if len(args) == 3 {
			err := sqleng.SetupFillmode(query, interval, args[2])
			if err != nil {
				return "", err
			}
		}
		return fmt.Sprintf("floor((%s)/%v)*%v", args[0], interval.Seconds(), interval.Seconds()), nil
	case "__unixEpochGroupAlias":
		tg, err := m.evaluateMacro(timeRange, query, "__unixEpochGroup", args)
		if err == nil {
			return tg + " AS \"time\"", nil
		}
		return "", err
	//GSAI - custom macros
	case "__isTimeFromOutsideThreshold":
		if len(args) != 1 {
			return "", fmt.Errorf("expecting threshold argument of type int alone to be passed: passed arguments are %v", args)
		}
		var thresholdInDays int
		_, err := fmt.Sscan(args[0], &thresholdInDays)
		if err != nil {
			return "", fmt.Errorf("unable to parse threshold '%s': %w", args[0], err)
		}
		durationInHours := time.Now().UTC().Sub(timeRange.From.UTC()).Hours()
		if int(durationInHours) > (24 * thresholdInDays) {
			return "true", nil
		}
		return "false", nil
	case "__isNull":
		for _, arg := range args {
			if arg != "NULL" {
				return "false", nil
			}
		}
		return "true", nil
	case "__constructPredicates":
		if len(args) == 1 && args[0] == "" {
			return "true", nil
		}
		var filtersList []string
		for _, arg := range args {
			argList := strings.Split(arg, ":")
			macrosLogger.Debug("splitting args", "argList", fmt.Sprintf("%v", argList))
			if len(argList) != 2 {
				return "", fmt.Errorf("error in parsing arguments: not wrapped in double quotes")
			}
			keyName := strings.TrimSpace(argList[0])
			value := strings.TrimSpace(argList[1])
			if !m.isNullOrEmpty(value) {
				value = m.escapeSqlSingleQuotes(value)
				formattedArgList := fmt.Sprintf("%s in (%s)", keyName, value)
				filtersList = append(filtersList, formattedArgList)
			}
		}
		if len(filtersList) == 0 {
			return "true", nil
		}
		return strings.Join(filtersList, " and "), nil
	default:
		return "", fmt.Errorf("unknown macro %q", name)
	}
}

func (m *postgresMacroEngine) isNullOrEmpty(value string) bool {
	return value == "NULL" || len(value) == 0
}

func (m *postgresMacroEngine) escapeSqlSingleQuotes(value string) string {
	values := strings.Split(value, ",")
	for i := range values {
		values[i] = strings.TrimSpace(values[i])
		values[i] = strings.Trim(values[i], `'`)
		values[i] = strings.ReplaceAll(values[i], `'`, `''`)
		values[i] = fmt.Sprintf(`'%s'`, values[i])
	}
	return strings.Join(values, ",")
}
