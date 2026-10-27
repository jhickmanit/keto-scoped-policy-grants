.PHONY: generate check test test-a compare prior

generate:
	go run gen/main.go

check:
	@test -z "$$(gofmt -l gen/*.go)" || { gofmt -l gen/*.go; exit 1; }
	go vet ./...
	go test ./...
	bash -n test/run.sh test/lib.sh test/prior-pattern/run.sh test/runner-errors.sh
	bash test/runner-errors.sh

test: test-a

test-a:
	bash test/run.sh setup-a-grants

compare:
	bash test/run.sh

prior:
	bash test/prior-pattern/run.sh
